import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import { serializeGame } from '@/games/store/gameFactoriesActions';
import { STALE_LEADER_THRESHOLD_MS } from './realtimeSyncTypes';

/**
 * Last-resort save used on page unload (beforeunload event). See issue #127
 * for the failure mode this guards against.
 *
 * Why fetch + keepalive (not the Supabase JS client):
 *   1. During unload the browser aborts pending JS Promises, so any async
 *      work started by `supabaseClient.from(...).update(...)` is killed
 *      before it reaches the network. `keepalive: true` tells the browser
 *      to let this specific request complete in the background after the
 *      page is gone.
 *   2. `navigator.sendBeacon` would also survive unload but doesn't allow
 *      custom headers (we need `Authorization: Bearer ...` and `apikey`).
 *
 * Why the conditional `updated_at=eq.<lastKnown>` filter:
 *   When a tab loses websocket sync (iOS background throttling, Chrome
 *   tab freezing, network blip) it can stop receiving peer patches while
 *   still considering itself authoritative. Closing such a tab without
 *   any guard would issue a PATCH carrying *stale* state, blindly
 *   overwriting the fresher row another device just wrote. The filter
 *   makes this PATCH a no-op when the row has moved on, at the cost of
 *   silently dropping the local last-second edits — those still live in
 *   IndexedDB and the next foreground tab will reconcile them.
 *
 * Why the `peerCount + lastPatchAppliedAt` heuristic:
 *   Belt-and-suspenders for the rare case where `lastKnown` happens to
 *   match the server (race at millisecond granularity, or a successful
 *   save right before the freeze that bumped local `updatedAt` without
 *   ingesting subsequent peer patches). If we are in a multi-peer
 *   channel and the inbound patch stream has gone quiet for over a
 *   minute, we treat the tab as potentially isolated and bail out
 *   entirely. Single-tab setups (peerCount === 0) skip the check
 *   because there is nobody to overwrite.
 *
 * Fire-and-forget: by design we cannot observe the response. If the
 * request is rejected the user loses the last few seconds of edits
 * (bounded by AUTO_SAVE_DEBOUNCE_MS). The remote backup history
 * (`game_versions`, migration 0002) is the final safety net.
 */
export interface FlushRemoteGameOnUnloadContext {
  /** Timestamp (ms) of the most recent patch applied by this tab (peer or local). */
  lastPatchAt: number;
  /** Other senders currently observed on the realtime channel (excluding this tab). */
  peerCount: number;
}

export function flushRemoteGameOnUnload(
  gameId: string,
  ctx: FlushRemoteGameOnUnloadContext,
): void {
  const state = useStore.getState();
  const game = state.games.games[gameId];
  const session = state.auth.session;
  if (!game?.savedId || !session) return;

  // Stale-leader bail-out: in a populated channel we expect to see at least
  // one patch per minute (any peer activity counts). Silence past the
  // threshold means our patch pipeline is broken and our state is suspect.
  if (
    ctx.peerCount > 0 &&
    Date.now() - ctx.lastPatchAt > STALE_LEADER_THRESHOLD_MS
  ) {
    return;
  }

  const lastKnown = game.updatedAt;
  // Conditional filter: skip the keepalive entirely if we don't have a
  // baseline to compare against (would degrade to an unconditional
  // overwrite, which is exactly what we want to avoid).
  if (!lastKnown) return;

  const url =
    `${SUPABASE_URL}/rest/v1/games` +
    `?id=eq.${encodeURIComponent(game.savedId)}` +
    `&updated_at=eq.${encodeURIComponent(lastKnown)}`;

  fetch(url, {
    method: 'PATCH',
    keepalive: true,
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    // The server-side trigger `games_touch_updated_at` (migration 0002)
    // bumps `updated_at` for us, so we don't include it here.
    body: JSON.stringify({
      data: serializeGame(gameId),
    }),
  }).catch(() => {});
}
