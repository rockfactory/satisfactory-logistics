import { useEffect } from 'react';
import { useStore } from '@/core/zustand';
import { onStorePatches } from '@/core/zustand-helpers/immer';
import {
  isBroadcastSuppressed,
  isGamePatch,
} from '@/games/sync/realtimeSyncTypes';
import { isDirtyTrackingSuppressed } from './dirtyTrackingSuppression';

export function useTrackGameDirty() {
  useEffect(() => {
    return onStorePatches(patches => {
      // Broadcast suppression means "this mutation came from a save/remote
      // peer, not from the user" — the same filter we want for dirty
      // tracking. Keep honoring it here so any call site that already uses
      // it (e.g. saveRemoteGame echoing server metadata back into the
      // store) stays correctly skipped.
      if (isBroadcastSuppressed()) return;
      if (isDirtyTrackingSuppressed()) return;
      if (!patches.some(isGamePatch)) return;
      const gameId = useStore.getState().games.selected;
      if (!gameId) return;
      const at = Date.now();
      // emitStorePatches fires inside the origin action's produceWithPatches,
      // i.e. still inside Zustand's set(). Updating state here would be
      // clobbered when the outer set returns. Defer so the dirty marker
      // lands after the current action settles.
      queueMicrotask(() => useStore.getState().markGameDirty(gameId, at));
    });
  }, []);
}
