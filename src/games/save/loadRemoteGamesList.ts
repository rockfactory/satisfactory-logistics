import { notifications } from '@mantine/notifications';
import type { QueryData } from '@supabase/supabase-js';
import type { Json } from '@/core/database.types';
import { loglev } from '@/core/logger/log';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import { snapshotRemote } from '@/games/save/snapshotRemoteGame';
import { serializeGame } from '@/games/store/gameFactoriesActions';
import { withSuppressedDirtyTracking } from './dirtyTrackingSuppression';

const logger = loglev.getLogger('games:remote-list');

// Shared and normal
const loadRemoteGamesQuery = supabaseClient
  .from('games')
  .select(
    `
    id, 
    name, 
    author_id,
    data,
    created_at, 
    updated_at,
    share_token
  `,
  )
  .order('created_at', { ascending: false });

export type RemoteLoadedGamesList = QueryData<typeof loadRemoteGamesQuery>;

export async function loadRemoteGamesList() {
  const { auth } = useStore.getState();
  if (!auth.session) {
    console.log('No session, skipping load');
    return;
  }

  useStore.getState().setIsLoading(true);
  try {
    const { data, error } = await loadRemoteGamesQuery;

    if (error) {
      // Issue #127, audit vector #5: an error response previously
      // fell through and triggered `setRemoteGames(null/[])`, which
      // orphaned the savedId of every locally registered game.
      // Bail out cleanly so the local state is preserved.
      console.error('Error loading games:', error);
      notifications.show({
        color: 'red',
        title: 'Error loading games',
        message: error.message,
      });
      return;
    }

    if (!data) {
      console.log('No games loaded');
      return;
    }

    console.log('Loaded games:', data);

    // Snapshot local state for any game whose remote copy is strictly
    // newer. We're about to apply remote in full (see
    // `loadSerializedGameIntoState`), so this captures any potential
    // offline-only edits before they're overwritten. Best-effort: a
    // failed snapshot must not block the merge.
    const overwrittenNames = await snapshotPreCloudMerge(data);

    withSuppressedDirtyTracking(() => {
      useStore.getState().setRemoteGames(data, { authoritative: true });
    });

    if (overwrittenNames.length > 0) {
      notifications.show({
        color: 'blue',
        title: 'Cloud version applied',
        message: `Newer changes from another device were applied for: ${overwrittenNames.join(', ')}. Your previous local copy is in Backups.`,
      });
    }
  } finally {
    useStore.getState().setIsLoading(false);
  }
}

/**
 * For each remote row whose `updated_at` is strictly newer than the matching
 * local game's `updatedAt`, take a `pre-cloud-merge` snapshot of the local
 * state. Returns the display names of games whose local copy was snapshotted
 * (caller uses this to surface a single notification).
 *
 * The matching key is the `serialized.game.id` stored inside the data blob
 * (the local UUID), cross-checked against `local.savedId === remote.id` to
 * avoid mistaking unrelated games that happen to share an id after an
 * import/restore.
 */
export async function snapshotPreCloudMerge(
  remoteGames: RemoteLoadedGamesList,
): Promise<string[]> {
  const state = useStore.getState();
  const overwrittenNames: string[] = [];

  for (const remote of remoteGames) {
    const blob = remote.data as unknown as { game?: { id?: string } } | null;
    const localGameId = blob?.game?.id;
    if (!localGameId) continue;
    const local = state.games.games[localGameId];
    if (!local?.savedId || local.savedId !== remote.id) continue;
    if (!remote.updated_at || !local.updatedAt) continue;

    const remoteTs = new Date(remote.updated_at).getTime();
    const localTs = new Date(local.updatedAt).getTime();
    if (remoteTs <= localTs) continue;

    try {
      const localData = serializeGame(localGameId) as unknown as Json;
      const ok = await snapshotRemote(
        local.savedId,
        'pre-cloud-merge',
        localData,
      );
      if (ok) overwrittenNames.push(local.name);
    } catch (err) {
      logger.warn(
        `Pre-cloud-merge snapshot failed for "${local.name}" (savedId=${local.savedId})`,
        err,
      );
    }
  }

  return overwrittenNames;
}
