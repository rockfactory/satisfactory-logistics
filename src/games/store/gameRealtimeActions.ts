import { applyPatches, type Patch } from 'immer';
import { createActions } from '@/core/zustand-helpers/actions';

/**
 * Applies a list of immer patches received from a peer to the root state.
 *
 * Goes through the normal action wrapper so the resulting state stays frozen
 * (immer invariant) and zustand's setState replaces atomically. The wrapper
 * will emit its own patches as a side-effect; callers must wrap this call in
 * `withSuppressedBroadcast(...)` to avoid bouncing the same patches back to
 * the peer that sent them.
 *
 * Note: when `state` is an immer draft (it is here, because produceWithPatches
 * is in the wrapper), `applyPatches` mutates in-place instead of returning a
 * new object.
 */
export const gameRealtimeActions = createActions({
  applyRemotePatches: (patches: Patch[]) => state => {
    applyPatches(state, patches);
  },
});
