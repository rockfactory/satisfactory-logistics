import { useShallowStore, useStore } from '@/core/zustand';

export function useIsFactoryVisible(
  factoryId: string,
  isRoot: boolean,
  resource?: string | null | undefined,
) {
  const { filterName, filterResource, viewMode } = useStore(
    state => state.factoryView,
  );
  const factoryName = useStore(
    state => state.factories.factories[factoryId]?.name,
  );
  const factoryResources = useShallowStore(state => [
    ...(state.factories.factories[factoryId]?.outputs?.map(o => o.resource) ??
      []),
    ...(state.factories.factories[factoryId]?.inputs?.map(i => i.resource) ??
      []),
  ]);

  if (
    filterName &&
    !factoryName?.toLowerCase().includes(filterName?.toLowerCase() ?? '')
  ) {
    return false;
  }

  if (filterResource && !isRoot && resource !== filterResource) {
    return false;
  }

  if (filterResource && isRoot && !factoryResources.includes(filterResource)) {
    return false;
  }

  return true;
}
