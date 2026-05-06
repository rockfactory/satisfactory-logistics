import type { Game } from '@/games/Game';
import type { SerializedGame } from '@/games/store/gameFactoriesActions';

/**
 * Heuristics that detect "suspicious" sync transitions — payloads that
 * look like the result of a stale device clobbering good data (see
 * issue #127). The guard does not block the sync; the caller still
 * applies the transition so peers stay in convergence. Its job is to
 * log the event and force a snapshot into `game_versions` so the user
 * can recover.
 */

/**
 * Drop ratio threshold. A transition where the new state's factory
 * count is this much smaller than the previous state is treated as a
 * likely accident.
 *
 * Tuning: kept loose (50%) to cover the documented incident from #127
 * (15 factories collapsing to 1) without false-positiving on routine
 * cleanup edits.
 */
export const SHRINK_RATIO_THRESHOLD = 0.5;

export interface ShrinkVerdict {
  suspiciousShrink: boolean;
  /** Factory count in the state that's about to be replaced. */
  previousFactoryCount: number;
  /** Factory count in the proposed replacement state. */
  nextFactoryCount: number;
}

function evaluate(
  previousFactoryCount: number,
  nextFactoryCount: number,
): ShrinkVerdict {
  // 0 → N and N → 0 are not flagged: a genuine "delete everything"
  // operation is rare but legitimate, and the user-initiated path
  // (delete-game) is its own confirmation flow. Auto-snapshot still
  // protects them via the regular auto-save throttle.
  const suspiciousShrink =
    nextFactoryCount > 0 &&
    previousFactoryCount > 0 &&
    nextFactoryCount <=
      Math.floor(previousFactoryCount * (1 - SHRINK_RATIO_THRESHOLD));

  return { suspiciousShrink, previousFactoryCount, nextFactoryCount };
}

/**
 * Used when an incoming remote payload (full-state response, override
 * load) is about to replace the local state. "Previous" is local,
 * "next" is the incoming payload.
 */
export function assessIncomingShrink(
  local: Game | undefined,
  incoming: SerializedGame,
): ShrinkVerdict {
  return evaluate(
    local?.factoriesIds?.length ?? 0,
    incoming.game.factoriesIds?.length ?? 0,
  );
}

/**
 * Used before pushing local state to the DB (e.g. the leader path in
 * the realtime DB-fallback). The transition we are guarding against
 * is overwriting a richer remote with a thinner local copy — so
 * "previous" is remote, "next" is local.
 */
export function assessLocalVsRemote(
  localSerialized: SerializedGame,
  remoteFactoryIds: string[] | null | undefined,
): ShrinkVerdict {
  return evaluate(
    remoteFactoryIds?.length ?? 0,
    localSerialized.game.factoriesIds?.length ?? 0,
  );
}
