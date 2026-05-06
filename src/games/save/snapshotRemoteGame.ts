import type { Json } from '@/core/database.types';
import { loglev } from '@/core/logger/log';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import { serializeGame } from '@/games/store/gameFactoriesActions';

const logger = loglev.getLogger('games:snapshot');

/**
 * Reasons used when recording a snapshot. Mirrors the `reason` column on
 * `public.game_versions`. Plain string at the schema level so we don't need a
 * DB enum, but we narrow it here for callers.
 */
export type SnapshotReason =
  | 'auto'
  | 'manual'
  | 'pre-restore'
  | 'pre-cloud-merge'
  | 'shrink-guard'
  | 'shrink-guard-fullstate'
  | 'shrink-guard-dbfallback';

/**
 * Minimum gap between two automatic snapshots for the same game. Manual and
 * shrink-guard snapshots bypass this throttle (callers use {@link snapshotRemote}
 * directly with `force: true`-equivalent semantics).
 *
 * Tuning: 15 minutes balances the supabase plan storage budget (ring buffer
 * caps at 20 rows per game on the server, see migration 0002) against the
 * user's expected recovery granularity.
 */
export const REMOTE_SNAPSHOT_THROTTLE_MS = 15 * 60_000;

const lastSnapshotAt = new Map<string, number>();

/**
 * Unconditional snapshot. Used by shrink-guard and the explicit "Save
 * snapshot now" button — callers that need a guaranteed save regardless of
 * the auto-throttle. Returns `true` on success and `false` on any error
 * (network, RLS denial, RPC missing, ...). Never throws.
 */
export async function snapshotRemote(
  savedId: string,
  reason: SnapshotReason,
  data: Json,
): Promise<boolean> {
  if (!useStore.getState().auth.session) {
    logger.warn(
      `Snapshot skipped (reason=${reason}): no auth session. Snapshots require a logged-in user — the row would be rejected by RLS.`,
    );
    return false;
  }
  try {
    const { error } = await supabaseClient.rpc('snapshot_game', {
      p_saved_id: savedId,
      p_data: data,
      p_reason: reason,
    });
    if (error) throw error;
    lastSnapshotAt.set(savedId, Date.now());
    logger.debug(`Snapshot taken (reason=${reason}) for saved_id=${savedId}`);
    return true;
  } catch (err) {
    // Snapshot failures are non-fatal: we never block a regular save on
    // this. The boolean return lets `maybeSnapshotRemote` decide whether
    // to release its optimistic throttle claim.
    logger.warn(`Snapshot failed (reason=${reason})`, err);
    return false;
  }
}

/**
 * Throttled auto-snapshot. Skips if a snapshot for this game was taken less
 * than {@link REMOTE_SNAPSHOT_THROTTLE_MS} ago. Resolves immediately when
 * skipped — never throws.
 */
export async function maybeSnapshotRemote(
  gameId: string,
  opts: { reason: SnapshotReason },
): Promise<void> {
  const game = useStore.getState().games.games[gameId];
  if (!game?.savedId) return;
  const savedId = game.savedId;
  const last = lastSnapshotAt.get(savedId) ?? 0;
  if (Date.now() - last < REMOTE_SNAPSHOT_THROTTLE_MS) return;
  // Optimistically claim the slot before the await so concurrent callers
  // don't both pass the gate. Restore if the RPC ends up failing — we'd
  // rather retry sooner than block the throttle for 15 minutes on a
  // transient network error.
  lastSnapshotAt.set(savedId, Date.now());
  const ok = await snapshotRemote(
    savedId,
    opts.reason,
    serializeGame(gameId) as unknown as Json,
  );
  if (!ok) {
    lastSnapshotAt.delete(savedId);
  }
}

/** Test-only: clears the in-memory throttle map. */
export function __resetSnapshotThrottleForTests(): void {
  lastSnapshotAt.clear();
}

// TODO(local-backup): Wrap an IndexedDB ring buffer alongside the remote
// snapshot in a follow-up PR. The local copy gives us an offline safety net
// even when the user is logged out or Supabase is unreachable.
