import { notifications } from '@mantine/notifications';
import { v4 } from 'uuid';
import type { Json } from '@/core/database.types';
import { loglev } from '@/core/logger/log';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import {
  type SerializedGame,
  serializeGame,
} from '@/games/store/gameFactoriesActions';
import type { ILoadRemoteGameOptions } from '@/games/store/gameRemoteActions';
import { assessIncomingShrink } from '@/games/sync/integrityGuard';
import { withSuppressedDirtyTracking } from './dirtyTrackingSuppression';
import { saveRemoteGame } from './saveRemoteGame';
import { snapshotRemote } from './snapshotRemoteGame';

const logger = loglev.getLogger('games:loader');

export async function loadRemoteGame(
  gameId: string,
  options: ILoadRemoteGameOptions = {},
) {
  const { auth } = useStore.getState();
  useStore.getState().setIsLoading(true);
  try {
    if (!auth.session) {
      logger.info('No session, skipping load');
      notifications.show({
        title: 'Login to load games',
        message: 'You need to login to load games',
      });
      return;
    }

    const existingGame = useStore.getState().games.games[gameId];
    if (!existingGame?.savedId) {
      throw new Error('No saved ID found for game');
    }

    const serialized = await loadRemoteGameBySavedId(existingGame.savedId, {
      ...options,
      shrinkGuardLocalGameId: gameId,
    });
    if (!serialized) return;
    useStore.getState().selectGame(serialized.game.id);
  } catch (error: any) {
    logger.error('Error loading game:', error);
    notifications.show({
      title: 'Error loading game',
      message: error?.message ?? error ?? 'Unknown error',
    });
  } finally {
    useStore.getState().setIsLoading(false);
  }
}

export interface LoadRemoteGameBySavedIdOptions extends ILoadRemoteGameOptions {
  /**
   * Local game id used to read the pre-load state for the shrink guard.
   * Defaults to the incoming `serialized.game.id` (covers the case where the
   * remote game does not yet exist locally — there's nothing to compare
   * against, so the guard simply no-ops).
   */
  shrinkGuardLocalGameId?: string;
}

/**
 * Fetch a single remote game's full `data` blob and apply it to the store.
 * Used by `loadRemoteGame` (the user-facing "Load from cloud") and by
 * `loadRemoteGamesList`'s lazy per-game fetch (only for rows whose remote
 * `updated_at` is strictly newer than local, or that don't exist locally).
 *
 * Returns the serialized payload on success so the caller can decide
 * whether to also `selectGame` (only the user-facing path does).
 */
export async function loadRemoteGameBySavedId(
  savedId: string,
  options: LoadRemoteGameBySavedIdOptions = {},
): Promise<SerializedGame | undefined> {
  const { data, error } = await supabaseClient
    .from('games')
    .select('data, author_id, id, created_at, updated_at, share_token')
    .eq('id', savedId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('No data returned');

  let serialized = data.data as unknown as SerializedGame;
  logger.info('Loaded game:', serialized);

  // Internal-id collision: another local game already lives at
  // `serialized.game.id` but points to a different remote row. This is the
  // typical signature of a duplicated cloud row (the user clicked
  // "Save to cloud" twice and the second insert reused the first blob's
  // internal id). If we apply the incoming blob as-is we'd clobber the
  // existing entry, and the lazy-fetch loop would re-pull the loser at
  // every reload (infinite egress drain). Reroute the incoming blob to
  // fresh UUIDs so both games coexist, then push the remapped blob back to
  // the cloud row so the next reload reads the disambiguated copy.
  let needsResaveAfterRemap = false;
  const collidingLocal = useStore.getState().games.games[serialized.game.id];
  if (collidingLocal?.savedId && collidingLocal.savedId !== savedId) {
    logger.warn(
      `Local id collision: incoming "${serialized.game.name}" (savedId=${savedId}) clashes with existing "${collidingLocal.name}" (savedId=${collidingLocal.savedId}); remapping ids.`,
    );
    serialized = remapSerializedIds(serialized);
    needsResaveAfterRemap = true;
  }

  // Shrink guard: a remote payload that drops the factory count
  // sharply has the signature of issue #127. Snapshot the current
  // local state before letting the override delete factories so
  // the user can recover from "Backup history" even if the remote
  // turns out to be the corrupt copy. Never skip applying — that
  // would break convergence with the rest of the cluster.
  if (options.override) {
    const compareGameId = options.shrinkGuardLocalGameId ?? serialized.game.id;
    const localGame = useStore.getState().games.games[compareGameId];
    const verdict = assessIncomingShrink(localGame, serialized);
    if (verdict.suspiciousShrink) {
      logger.warn(
        `Suspicious shrink in remote load: ${verdict.previousFactoryCount} -> ${verdict.nextFactoryCount} factories. Snapshotting current state before overriding.`,
      );
      // Snapshot the *current* local state before the override wipes it.
      const payload = serializeGame(compareGameId) as unknown as Json;
      void snapshotRemote(savedId, 'shrink-guard-fullstate', payload);
      notifications.show({
        title: 'Backup snapshot saved before sync',
        message:
          'A large drop in factories was detected from another device. The previous state has been backed up under Game settings → Backup history.',
        color: 'blue',
      });
    }
  }

  withSuppressedDirtyTracking(() => {
    useStore.getState().loadRemoteGame(serialized, data, options);
  });

  if (needsResaveAfterRemap) {
    // Persist the remapped blob to the SAME cloud row so the next reload
    // reads the disambiguated ids. Unconditional because we already hold
    // the freshest `updated_at` (we just read it), and silent because the
    // user did not initiate this save.
    try {
      await saveRemoteGame(serialized.game.id, {
        silent: true,
        unconditional: true,
      });
    } catch (err) {
      logger.warn(`Failed to persist remapped blob (savedId=${savedId})`, err);
    }
  }

  return serialized;
}

/**
 * Mint fresh UUIDs for the game id and every factory id in the blob.
 * Used when the incoming `serialized.game.id` collides with another
 * local game already linked to a different cloud row (a duplicate
 * insert in the cloud). Solver instances are keyed by factory id, so
 * remapping the factory map covers them too. References that point at
 * factory ids from OTHER games (cross-game input links) are left
 * untouched; if a future audit shows they exist they can be remapped
 * here too.
 */
function remapSerializedIds(serialized: SerializedGame): SerializedGame {
  const idMap = new Map<string, string>();
  idMap.set(serialized.game.id, v4());
  for (const factory of serialized.factories) {
    if (!idMap.has(factory.id)) idMap.set(factory.id, v4());
  }
  return {
    game: {
      ...serialized.game,
      id: idMap.get(serialized.game.id) ?? serialized.game.id,
      factoriesIds: serialized.game.factoriesIds.map(id => idMap.get(id) ?? id),
    },
    factories: serialized.factories.map(f => ({
      ...f,
      id: idMap.get(f.id) ?? f.id,
    })),
    solvers: serialized.solvers.map(s => ({
      ...s,
      id: idMap.get(s.id) ?? s.id,
    })),
  };
}
