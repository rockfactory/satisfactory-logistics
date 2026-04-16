import { useStore } from '@/core/zustand';
import { WORLD_SOURCE_ID } from '@/factories/Factory';
import { getWorldResourceMax } from '@/recipes/WorldResources';
import type { IFactoryUsageProps } from './FactoryUsage';

export function useOutputUsage(
  options: Pick<IFactoryUsageProps, 'factoryId' | 'output'>,
) {
  const producedAmount = useStore(state => {
    if (options.factoryId === WORLD_SOURCE_ID) {
      return getWorldResourceMax(options.output);
    }
    const source = state.factories.factories[options.factoryId ?? ''];
    if (source?.progress === 'disabled') return 0;
    return Math.max(
      source?.outputs
        ?.filter(o => o?.resource === options.output)
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

  return { percentage, producedAmount, usedAmount };
}
