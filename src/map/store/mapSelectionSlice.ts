import { createSlice } from '@/core/zustand-helpers/slices';
import type { OverclockStep } from '../extraction';

/**
 * Ephemeral, session-only state backing the "sum nodes" experience.
 * Intentionally excluded from persistence via `partialize` in the
 * root store so it resets on every reload — matches the mental model
 * of a transient aggregate rather than a saved shopping list.
 */
export interface MapSelectionSlice {
  /**
   * Whether the map is in "sum" mode. In sum mode, clicking a marker
   * toggles it in/out of the selection instead of opening its popup.
   * Tapping the same marker again deselects.
   */
  sumMode: boolean;
  /** Node ids currently in the selection (order preserved). */
  selectedNodeIds: string[];
  /**
   * Extractor id used when summing solid-ore yields in the aggregate
   * panel. Defaults to Miner Mk3 since that's the end-game target
   * most players are planning around.
   */
  selectedMinerId: string;
  /** Overclock percentage applied uniformly across the aggregate. */
  selectedOverclock: OverclockStep;
}

export const initialMapSelectionState = (): MapSelectionSlice => ({
  sumMode: false,
  selectedNodeIds: [],
  selectedMinerId: 'Build_MinerMk3_C',
  selectedOverclock: 100,
});

export const mapSelectionSlice = createSlice({
  name: 'mapSelection',
  value: initialMapSelectionState() as MapSelectionSlice,
  actions: {
    setSumMode: (enabled: boolean) => state => {
      state.sumMode = enabled;
      // Intentionally keep selectedNodeIds when leaving sum mode so
      // the user's aggregates don't vanish the moment they step out
      // of the multi-select workflow to inspect a popup.
    },
    toggleSumMode: () => state => {
      state.sumMode = !state.sumMode;
    },
    toggleNodeSelected: (nodeId: string) => state => {
      const idx = state.selectedNodeIds.indexOf(nodeId);
      if (idx === -1) {
        state.selectedNodeIds.push(nodeId);
      } else {
        state.selectedNodeIds.splice(idx, 1);
      }
    },
    addNodeToSelection: (nodeId: string) => state => {
      if (!state.selectedNodeIds.includes(nodeId)) {
        state.selectedNodeIds.push(nodeId);
      }
    },
    removeNodeFromSelection: (nodeId: string) => state => {
      const idx = state.selectedNodeIds.indexOf(nodeId);
      if (idx !== -1) state.selectedNodeIds.splice(idx, 1);
    },
    clearSelection: () => state => {
      state.selectedNodeIds = [];
    },
    setSelectedMinerId: (minerId: string) => state => {
      state.selectedMinerId = minerId;
    },
    setSelectedOverclock: (overclock: OverclockStep) => state => {
      state.selectedOverclock = overclock;
    },
  },
});
