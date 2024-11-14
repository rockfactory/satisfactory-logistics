import type { Json } from '@/core/database.types';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import { notifications } from '@mantine/notifications';
import { serializeGame } from '@/games/store/gameFactoriesActions';

export async function saveRemoteGame(gameId?: string | null) {
  const { auth } = useStore.getState();
  useStore.getState().setIsSaving(true);
  try {
    if (!auth.session) {
      console.log(
        'No session, skipping save, previous at ' + auth.sync.syncedAt,
      );
    }

    // if (Date.now() - auth.sync.syncedAt < 15_000) {
    //   console.log('Skipping save, previous at ' + auth.sync.syncedAt);
    //   return;
    // }

    const state = useStore.getState();
    gameId ??= state.games.selected!;
    const game = state.games.games[gameId ?? ''];
    if (!game) {
      console.error('No game, skipping save');
      notifications.show({
        title: 'Error saving game',
        message: 'No game selected',
      });
      return;
    }

    const { data, error } = await supabaseClient
      .from('games')
      .upsert({
        id: game.savedId ?? undefined,
        author_id: game.authorId ?? auth.session!.user.id,
        name: game.name,
        // We save only the _current_ state, not the whole state with undo history
        data: serializeGame(gameId) as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .select('id, author_id, created_at, share_token')
      .single();

    if (error) {
      console.error('Error syncing factories:', error);
      throw error;
    }

    console.log('Saved game to remote:', data);
    useStore.getState().setRemoteGameData(game.id, data);
  } catch (error: any) {
    console.error('Error saving game:', error);
    notifications.show({
      title: 'Error saving game',
      message: error?.message ?? error ?? 'Unknown error',
    });
  } finally {
    useStore.getState().setIsSaving(false);
  }
}
