import { createActions } from '@/core/zustand-helpers/actions';

export const factoryViewSortActions = createActions({
  sortFactoriesBy: (sortBy: 'name') => state => {
    state.factoryView.sortBy = sortBy;
    state.games.games[state.games.selected ?? '']?.factoriesIds.sort((a, b) => {
      const factoryA = state.factories.factories[a];
      const factoryB = state.factories.factories[b];
      return factoryA.name?.localeCompare(factoryB.name ?? '') ?? 0;
    });
  },
});
