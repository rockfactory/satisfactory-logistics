import { notifications } from '@mantine/notifications';
import type { Json } from '@/core/database.types';
import { loglev } from '@/core/logger/log';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import { loadRemoteGame } from '@/games/save/loadRemoteGame';
import { maybeSnapshotRemote } from '@/games/save/snapshotRemoteGame';
import { serializeGame } from '@/games/store/gameFactoriesActions';
import { withSuppressedBroadcast } from '@/games/sync/realtimeSyncTypes';

const logger = loglev.getLogger('games:save');

const SELECT_REMOTE_DATA = 'id, author_id, created_at, updated_at, share_token';

export interface SaveRemoteGameOptions {
  silent?: boolean;
  /**
   * Skip the conditional `updated_at=eq.<lastKnown>` filter. The conditional
   * filter is the optimistic-locking primitive that prevents stale clients
   * from clobbering newer DB rows (see issue #127). Set this only for
   * caller-initiated overrides where the user explicitly accepts that they
   * want their state to win — currently: the "restore from backup" flow.
   * No-op for the insert path (a row that does not yet exist has nothing
   * to compare against).
   */
  unconditional?: boolean;
}

export async function saveRemoteGame(
  gameId?: string | null,
  options: SaveRemoteGameOptions = {},
) {
  const { auth } = useStore.getState();
  if (!options.silent) useStore.getState().setIsSaving(true);
  try {
    if (!auth.session) {
      logger.info(`No session, skipping save (syncedAt=${auth.sync.syncedAt})`);
      return;
    }

    const state = useStore.getState();
    gameId ??= state.games.selected!;
    const game = state.games.games[gameId ?? ''];
    if (!game) {
      logger.error('No game, skipping save');
      notifications.show({
        title: 'Error saving game',
        message: 'No game selected',
      });
      return;
    }

    const payload = {
      name: game.name,
      // Save only the current state, not the whole undo history.
      data: serializeGame(gameId) as unknown as Json,
    };

    if (!game.savedId) {
      // First save for this game: insert a brand-new row. The server fills
      // `updated_at` via default + trigger so we don't send it.
      const { data, error } = await supabaseClient
        .from('games')
        .insert({
          author_id: game.authorId ?? auth.session.user.id,
          ...payload,
        })
        .select(SELECT_REMOTE_DATA)
        .single();

      if (error) throw error;

      logger.info(`Inserted new remote game: ${data.id}`);
      withSuppressedBroadcast(() => {
        useStore.getState().setRemoteGameData(game.id, data);
      });
      maybeSnapshotRemote(gameId, { reason: 'auto' }).catch(() => {});
      return;
    }

    // Existing row: optimistic conditional update.
    //
    //   - The trigger `games_touch_updated_at` (migration 0002) sets
    //     `updated_at` server-side, so we don't send it in the payload.
    //   - We filter on the locally-known `updated_at` so a tab whose state
    //     is stale (missed patches, throttled websocket) cannot blindly
    //     overwrite a fresher row. Mismatch ⇒ 0 rows updated ⇒ we reload
    //     from DB and let the next edit re-arm the auto-save. We do NOT
    //     retry inline; that would just reintroduce the same race.
    //   - `unconditional: true` skips the filter for explicit user-driven
    //     overrides (restore from backup).
    const lastKnown = game.updatedAt;
    let query = supabaseClient
      .from('games')
      .update(payload)
      .eq('id', game.savedId);

    if (!options.unconditional && lastKnown) {
      query = query.eq('updated_at', lastKnown);
    }

    const { data, error } = await query
      .select(SELECT_REMOTE_DATA)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      if (options.unconditional) {
        // Unconditional update can only return 0 rows if the row no longer
        // exists or the user lost write access — reloading would fail too.
        // Surface a clear error instead of a confusing "lost race" reload.
        logger.error(
          `Unconditional save matched no rows for saved_id=${game.savedId}: row missing or RLS denied`,
        );
        notifications.show({
          color: 'red',
          title: 'Save failed',
          message:
            'The remote game could not be found. It may have been deleted by another user.',
        });
        return;
      }
      // Conditional update matched zero rows: someone else changed the row
      // between our read and our write. Reload remote, drop the in-flight
      // save. The user's local edits sit in pendingPatches/dirty until the
      // next debounce tick, which will re-issue the save against the fresh
      // `updated_at`.
      logger.warn(
        `Conditional save lost race for saved_id=${game.savedId}; reloading`,
      );
      await loadRemoteGame(gameId, { override: true });
      return;
    }

    logger.debug(`Saved game to remote: ${data.id}`);
    withSuppressedBroadcast(() => {
      useStore.getState().setRemoteGameData(game.id, data);
    });
    maybeSnapshotRemote(gameId, { reason: 'auto' }).catch(() => {});
  } catch (error: any) {
    logger.error('Error saving game:', error);
    notifications.show({
      title: 'Error saving game',
      message: error?.message ?? error ?? 'Unknown error',
    });
  } finally {
    if (!options.silent) useStore.getState().setIsSaving(false);
  }
}
