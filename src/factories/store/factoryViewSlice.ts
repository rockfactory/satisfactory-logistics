import type { Draft } from 'immer';
import { createSlice } from '@/core/zustand-helpers/slices';

export interface FactoryViewSlice {
  filterName: string | null;
  filterResource: string | null;
  sortBy: 'name';
  viewMode: 'spreadsheet' | 'kanban' | 'grid';
  readyToPlanHintDismissed?: boolean;
  /**
   * Bumped whenever a remote pull replaces an existing local game's data
   * in `loadSerializedGameIntoState` (override branch). Used as a remount
   * token by views that hold uncontrolled inputs (e.g. spreadsheet's
   * `<TextInput defaultValue=...>`). Normal local edits MUST NOT bump
   * this: typing in such an input should not remount the row.
   */
  remoteSyncEpoch: number;
}

export const factoryViewSlice = createSlice({
  name: 'factoryView',
  value: {
    filterName: null,
    filterResource: null,
    sortBy: 'name',
    viewMode: 'spreadsheet',
    readyToPlanHintDismissed: false,
    remoteSyncEpoch: 0,
  } as FactoryViewSlice,
  actions: {
    updateFactoryView:
      (fn: (state: Draft<FactoryViewSlice>) => void) => state => {
        fn(state);
      },
  },
});
