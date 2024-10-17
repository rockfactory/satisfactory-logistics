import { loglev } from '@/core/logger/log';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import { notifications } from '@mantine/notifications';
import type { SerializedGame } from '../store/gameFactoriesActions';

const logger = loglev.getLogger('games:loader');

export async function loadRemoteGame(gameId: string) {
  const { auth } = useStore.getState();
  useStore.getState().setIsLoading(true);
  try {
    if (!auth.session) {
      logger.info('No session, skipping save');
    }

    const existingGame = useStore.getState().games.games[gameId];

    const { data, error } = await supabaseClient
      .from('games')
      .select('data, author_id, id, created_at, updated_at')
      .eq('id', gameId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('No data returned');

    const serialized = data.data as unknown as SerializedGame;
    logger.info('Loaded game:', serialized);
    useStore.getState().loadRemoteGame(serialized, data);
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
