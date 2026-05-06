import type { Patch } from 'immer';
import type { GameRemoteData } from '@/games/Game';
import type { SerializedGame } from '@/games/store/gameFactoriesActions';

export { DEVICE_NAME, SENDER_ID } from './deviceIdentity';
export const PATCH_DEBOUNCE_MS = 150;
export const AUTO_SAVE_DEBOUNCE_MS = 40_000;
export const DB_FALLBACK_MS = 3_000;
export const BROADCAST_EVENT = 'game:patch';
export const BROADCAST_FULL_REQUEST = 'game:full-request';
export const BROADCAST_FULL_RESPONSE = 'game:full-response';

// HTTP presence (see game_presence table + useGamePresence hook).
// The websocket channel is opened only when the HTTP poll detects at least
// one other peer on the same save. Heartbeat and poll share the same tick.
// 20s is a balance between peer-detection latency (for a remote tab that
// isn't in focus and won't opportunistically poll) and HTTP load.
export const PRESENCE_TICK_MS = 20_000;
// TTL must tolerate browser throttling of setInterval in background tabs
// (Chrome can stretch to 60s+; Safari further). We set 180s (~4x heartbeat)
// so a backgrounded tab's row doesn't go stale while the tab is just
// switched away for a few minutes.
export const PRESENCE_TTL_SECONDS = 180;
// Grace period before closing the websocket when HTTP presence drops to
// zero. Absorbs short flaps (reload, token refresh, brief network blip)
// without keeping the slot alive long after a real disconnect. Stacks on
// top of TTL (PRESENCE_TTL_SECONDS) + poll cadence (PRESENCE_TICK_MS), so
// real-world channel close on a crash is ~TTL + poll + this.
export const ALONE_DOWNGRADE_MS = 60_000;
// Throttle for opportunistic polls (visibilitychange, online event,
// HoverCard open). Prevents spamming the REST endpoint.
export const PRESENCE_OPPORTUNISTIC_MIN_GAP_MS = 5_000;

// Stale-leader detection threshold for `flushRemoteGameOnUnload`. If a tab
// has not received or generated any patch in this window AND there are
// peers in the channel, we treat the tab as potentially isolated (iOS
// websocket throttling, Chrome tab freezing) and skip the keepalive PATCH
// to avoid overwriting the DB with stale state. The conditional
// `updated_at=eq.<lastKnown>` filter on the request is the primary safety
// net; this heuristic is belt-and-suspenders for the rare case where
// `lastKnown` happens to match the server (race at millisecond
// granularity). See issue #127 and the docblock in
// `flushRemoteGameOnUnload.ts` for the full rationale.
export const STALE_LEADER_THRESHOLD_MS = 60_000;

export interface PatchBroadcastPayload {
  senderId: string;
  seq: number;
  patches: Patch[];
}

export interface FullStateRequestPayload {
  senderId: string;
}

export interface FullStateResponsePayload {
  senderId: string;
  seq: number;
  serialized: SerializedGame;
  remoteData: Partial<GameRemoteData>;
}

export interface PresencePayload {
  senderId: string;
  userId: string;
  avatarUrl: string | null;
  displayName: string;
  deviceName: string;
  factoryId: string | null;
}

const GAME_SLICES = new Set(['games', 'factories', 'solvers']);
const IGNORED_GAME_PATHS = new Set(['selected']);

let _suppressBroadcast = false;

export function isBroadcastSuppressed(): boolean {
  return _suppressBroadcast;
}

export function withSuppressedBroadcast(fn: () => void): void {
  _suppressBroadcast = true;
  try {
    fn();
  } finally {
    _suppressBroadcast = false;
  }
}

export function isGamePatch(patch: Patch): boolean {
  const { path } = patch;
  if (typeof path[0] !== 'string' || !GAME_SLICES.has(path[0])) return false;
  if (path[0] === 'games' && IGNORED_GAME_PATHS.has(path[1] as string))
    return false;
  return true;
}
