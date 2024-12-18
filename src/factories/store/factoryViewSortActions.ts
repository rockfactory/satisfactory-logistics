import { createActions } from '@/core/zustand-helpers/actions';
import { UiState } from '@/core/zustand';

export const factoryViewSortActions = createActions<UiState>({
  sortFactoriesBy: (sortBy: 'name') => state => {
    state.factoryView.sortBy = sortBy;
  },
});
