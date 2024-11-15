import { loglev } from '@/core/logger/log';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import { notifications } from '@mantine/notifications';
import type { SerializedGame } from '@/games/store/gameFactoriesActions';
import type { ILoadRemoteGameOptions } from '@/games/store/gameRemoteActions';

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
    useStore.getState().loadRemoteGame(serialized, data, options);
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
