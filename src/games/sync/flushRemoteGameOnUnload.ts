import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import { serializeGame } from '@/games/store/gameFactoriesActions';

/**
 * Last-resort save used on page unload (beforeunload event).
 *
 * We use `fetch` with `keepalive: true` (direct PostgREST call) instead of
 * the Supabase JS client because:
 *   1. During unload, the browser aborts pending JS Promises: any async work
 *      started by `supabaseClient.from(...).upsert(...)` is killed before it
 *      reaches the network. `keepalive` tells the browser to let this specific
 *      request complete in the background even after the page is gone.
 *   2. `navigator.sendBeacon` would also survive unload but doesn't allow
 *      custom headers (we need `Authorization: Bearer ...` and `apikey`).
 *
 * Fire-and-forget: we can't observe the response, by design. If it fails the
 * data is still in IndexedDB locally, so worst case the user loses the last
 * few seconds of edits (bounded by AUTO_SAVE_DEBOUNCE_MS).
 */
export function flushRemoteGameOnUnload(gameId: string): void {
  const state = useStore.getState();
  const game = state.games.games[gameId];
  const session = state.auth.session;
  if (!game?.savedId || !session) return;

  fetch(`${SUPABASE_URL}/rest/v1/games?id=eq.${game.savedId}`, {
    method: 'PATCH',
    keepalive: true,
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      data: serializeGame(gameId),
      updated_at: new Date().toISOString(),
    }),
  }).catch(() => {});
}
