import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';

function generateSecureToken(length = 32) {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);

  // Convert the array of random values to a hexadecimal string
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function shareGame(gameId: string) {
  const { auth } = useStore.getState();
  if (!auth.session) {
    console.log('No session, skipping share');
  }

  const game = useStore.getState().games.games[gameId];
  // TODO check if game is saved before sharing
  if (!game || !game.savedId) {
    console.error('No game, skipping share');
    return;
  }

  const token = generateSecureToken();
  const { data, error } = await supabaseClient
    .from('games')
    .update({
      share_token: token,
    })
    .eq('id', game.savedId)
    .select('id')
    .single();

  if (error) {
    console.error('Error sharing game:', error);
    throw error;
  }

  useStore.getState().setSharedGameToken(gameId, token);

  return token;
}
