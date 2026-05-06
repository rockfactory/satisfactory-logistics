import { notifications } from '@mantine/notifications';
import type { QueryData } from '@supabase/supabase-js';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import { withSuppressedDirtyTracking } from './dirtyTrackingSuppression';

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
    withSuppressedDirtyTracking(() => {
      useStore.getState().setRemoteGames(data, { authoritative: true });
    });
  } finally {
    useStore.getState().setIsLoading(false);
  }
}
