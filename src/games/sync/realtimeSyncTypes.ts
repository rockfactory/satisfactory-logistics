import type { Patch } from 'immer';
import type { GameRemoteData } from '@/games/Game';
import type { SerializedGame } from '@/games/store/gameFactoriesActions';

export const SENDER_ID = crypto.randomUUID();
export const PATCH_DEBOUNCE_MS = 150;
export const AUTO_SAVE_DEBOUNCE_MS = 60_000;
export const DB_FALLBACK_MS = 3_000;
export const BROADCAST_EVENT = 'game:patch';
export const BROADCAST_FULL_REQUEST = 'game:full-request';
export const BROADCAST_FULL_RESPONSE = 'game:full-response';

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
