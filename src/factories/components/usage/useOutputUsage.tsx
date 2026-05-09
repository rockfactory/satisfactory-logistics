import { useStore } from '@/core/zustand';
import { MANUAL_SOURCE_ID, WORLD_SOURCE_ID } from '@/factories/Factory';
import { getWorldResourceMax } from '@/recipes/WorldResources';
import type { IFactoryUsageProps } from './FactoryUsage';

export function useOutputUsage(
  options: Pick<IFactoryUsageProps, 'factoryId' | 'output'>,
) {
  const producedAmount = useStore(state => {
    if (options.factoryId === WORLD_SOURCE_ID) {
      return getWorldResourceMax(options.output);
    }
    if (options.factoryId === MANUAL_SOURCE_ID) {
      // Manual inputs are user-supplied: no producer-side cap to enforce.
      return Number.POSITIVE_INFINITY;
    }
    const source = state.factories.factories[options.factoryId ?? ''];
    if (source?.progress === 'disabled') return 0;
    return Math.max(
      source?.outputs
        ?.filter(
          o => o?.resource === options.output && o?.destination !== 'depot',
        )
        .reduce((sum, o) => sum + (o?.amount ?? 0), 0) ?? 0,
      0,
    );
  });

  const depotAmount = useStore(state => {
    if (
      options.factoryId === WORLD_SOURCE_ID ||
      options.factoryId === MANUAL_SOURCE_ID
    ) {
      return 0;
    }
    const source = state.factories.factories[options.factoryId ?? ''];
    if (source?.progress === 'disabled') return 0;
    return Math.max(
      source?.outputs
        ?.filter(
          o => o?.resource === options.output && o?.destination === 'depot',
        )
        .reduce((sum, o) => sum + (o?.amount ?? 0), 0) ?? 0,
      0,
    );
  });

  const usedAmount = useStore(
    state =>
      state.games.games[state.games.selected ?? '']?.factoriesIds
        .map(id => state.factories.factories[id])
        .filter(f => f && f.progress !== 'disabled')
        .flatMap(f => f!.inputs)
        .filter(
          i =>
            i?.resource === options.output &&
            i?.factoryId === options.factoryId,
        )
        .reduce((sum, i) => sum + Math.max(i?.amount ?? 0, 0), 0) ?? 0,
  );

  let percentage = usedAmount / producedAmount;
  if (producedAmount === 0 && usedAmount !== 0) {
    percentage = Number.POSITIVE_INFINITY;
  }
  if (Number.isNaN(percentage)) {
    percentage = 0;
  }

  return { percentage, producedAmount, usedAmount, depotAmount };
}
