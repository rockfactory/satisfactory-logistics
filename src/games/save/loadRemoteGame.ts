import { notifications } from '@mantine/notifications';
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

    const { data, error } = await supabaseClient
      .from('games')
      .select('data, author_id, id, created_at, updated_at')
      .eq('id', existingGame.savedId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('No data returned');

    const serialized = data.data as unknown as SerializedGame;
    logger.info('Loaded game:', serialized);

    // Shrink guard: a remote payload that drops the factory count
    // sharply has the signature of issue #127. Snapshot the current
    // local state before letting the override delete factories so
    // the user can recover from "Backup history" even if the remote
    // turns out to be the corrupt copy. Never skip applying — that
    // would break convergence with the rest of the cluster.
    if (options.override) {
      const localGame = useStore.getState().games.games[serialized.game.id];
      const verdict = assessIncomingShrink(localGame, serialized);
      if (verdict.suspiciousShrink && existingGame.savedId) {
        logger.warn(
          `Suspicious shrink in remote load: ${verdict.previousFactoryCount} -> ${verdict.nextFactoryCount} factories. Snapshotting current state before overriding.`,
        );
        // Snapshot the *current* local state before the override wipes it.
        const payload = serializeGame(gameId) as unknown as Json;
        void snapshotRemote(
          existingGame.savedId,
          'shrink-guard-fullstate',
          payload,
        );
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
