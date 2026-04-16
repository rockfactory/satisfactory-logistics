import type { Draft } from 'immer';
import { createSlice } from '@/core/zustand-helpers/slices';

export interface FactoryViewSlice {
  filterName: string | null;
  filterResource: string | null;
  sortBy: 'name';
  viewMode: 'spreadsheet' | 'kanban' | 'grid';
  readyToPlanHintDismissed?: boolean;
}

export const factoryViewSlice = createSlice({
  name: 'factoryView',
  value: {
    filterName: null,
    filterResource: null,
    sortBy: 'name',
    viewMode: 'spreadsheet',
    readyToPlanHintDismissed: false,
  } as FactoryViewSlice,
  actions: {
    updateFactoryView:
      (fn: (state: Draft<FactoryViewSlice>) => void) => state => {
        fn(state);
      },
  },
});
