import { useShallowStore, useStore } from '@/core/zustand';
import { useCallback } from 'react';

export function useIsFactoryVisible(isRoot: boolean) {
  const { filterName, filterResource, viewMode } = useStore(
    state => state.factoryView,
  );
  const { factories } = useShallowStore(state => state.factories.factories);

  return useCallback(
    (factoryId: string, resource?: string | null | undefined) => {
      const factoryName = factories[factoryId]?.name;
      const factoryResources = [
        ...(factories[factoryId]?.outputs?.map(o => o.resource) ?? []),
        ...(factories[factoryId]?.inputs?.map(i => i.resource) ?? []),
      ];

      if (
        filterName &&
        !factoryName?.toLowerCase().includes(filterName?.toLowerCase() ?? '')
      ) {
        return false;
      }

      if (filterResource && !isRoot && resource !== filterResource) {
        return false;
      }

      if (
        filterResource &&
        isRoot &&
        !factoryResources.includes(filterResource)
      ) {
        return false;
      }

      return true;
    },
    [factories, filterResource, filterResource, viewMode, filterName, isRoot],
  );
}
