import { Draft } from 'immer';
import { createSlice } from '../core/zustand-helpers/slices';

interface FactoryViewSlice {
  filterName: string | null;
  filterResource: string | null;
  sortBy: 'name';
  viewMode: 'compact' | 'wide';
}

export const factoryViewSlice = createSlice({
  name: 'factoryView',
  value: {
    filterName: null,
    filterResource: null,
    sortBy: 'name',
    viewMode: 'compact',
  } as FactoryViewSlice,
  actions: {
    // TODO Apply sort
    updateFactoryView:
      (fn: (state: Draft<FactoryViewSlice>) => void) => state => {
        fn(state);
      },
  },
});
