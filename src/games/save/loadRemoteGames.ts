import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import { notifications } from '@mantine/notifications';
import type { QueryData } from '@supabase/supabase-js';

const loadRemoteGamesQuery = supabaseClient
  .from('games')
  .select('id, name, created_at, updated_at')
  .order('created_at', { ascending: false });

export type RemoteLoadedGamesList = QueryData<typeof loadRemoteGamesQuery>;

export async function loadRemoteGamesList() {
  const { auth } = useStore.getState();
  if (!auth.session) {
    console.log('No session, skipping load');
    return;
  }

  const { data, error } = await loadRemoteGamesQuery;

  if (error) {
    console.error('Error loading games:', error);
    notifications.show({
      color: 'red',
      title: 'Error loading games',
      message: error.message,
    });
  }

  if (!data) {
    console.log('No games loaded');
    return;
  }

  console.log('Loaded games:', data);
  useStore.getState().setRemoteGames(data);
}
