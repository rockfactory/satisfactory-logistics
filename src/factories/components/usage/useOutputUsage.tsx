import { useStore } from '../../../core/zustand';
import { getWorldResourceMax } from '../../../recipes/WorldResources';
import { WORLD_SOURCE_ID } from '../../Factory';
import { IFactoryUsageProps } from './FactoryUsage';

export function useOutputUsage(
  options: Pick<IFactoryUsageProps, 'factoryId' | 'output'>,
) {
  const producedAmount = useStore(state =>
    options.factoryId === WORLD_SOURCE_ID
      ? getWorldResourceMax(options.output)
      : Math.max(
          state.factories.factories[options.factoryId ?? '']?.outputs
            ?.filter(o => o?.resource === options.output)
            .reduce((sum, o) => sum + (o?.amount ?? 0), 0) ?? 0,
          0,
        ),
  );

  const usedAmount = useStore(
    state =>
      state.games.games[state.games.selected ?? '']?.factoriesIds
        .flatMap(id => state.factories.factories[id]?.inputs)
        .filter(
          i =>
            i?.resource === options.output &&
            i?.factoryId === options.factoryId,
        )
        .reduce((sum, i) => sum + Math.max(i?.amount ?? 0, 0), 0) ?? 0,
  );

  let percentage = usedAmount / producedAmount;
  if (producedAmount === 0) {
    percentage = Number.POSITIVE_INFINITY;
  }
  if (Number.isNaN(percentage)) {
    percentage = 0;
  }

  return { percentage, producedAmount, usedAmount };
}
