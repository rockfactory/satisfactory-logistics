import { type RootState, useShallowStore } from '@/core/zustand';
import { MANUAL_SOURCE_ID, WORLD_SOURCE_ID } from '@/factories/Factory';
import { getWorldResourceMax } from '@/recipes/WorldResources';
import type { IFactoryUsageProps } from './FactoryUsage';

export interface OutputUsage {
  percentage: number;
  producedAmount: number;
  usedAmount: number;
  depotAmount: number;
}

/**
 * Pure computation of how much of `output` is produced, depot-routed, and
 * consumed for a given source `factoryId`. Shared by hooks that need to
 * surface insufficient-supply state (e.g. `useOutputUsage`,
 * `useFactoryHasMissingInputs`).
 */
export function computeOutputUsage(
  state: RootState,
  options: Pick<IFactoryUsageProps, 'factoryId' | 'output'>,
): OutputUsage {
  const { factoryId, output } = options;

  let producedAmount: number;
  if (factoryId === WORLD_SOURCE_ID) {
    producedAmount = getWorldResourceMax(output);
  } else if (factoryId === MANUAL_SOURCE_ID) {
    // Manual inputs are user-supplied: no producer-side cap to enforce.
    producedAmount = Number.POSITIVE_INFINITY;
  } else {
    const source = state.factories.factories[factoryId ?? ''];
    if (source?.progress === 'disabled') {
      producedAmount = 0;
    } else {
      producedAmount = Math.max(
        source?.outputs
          ?.filter(o => o?.resource === output && o?.destination !== 'depot')
          .reduce((sum, o) => sum + (o?.amount ?? 0), 0) ?? 0,
        0,
      );
    }
  }

  let depotAmount: number;
  if (factoryId === WORLD_SOURCE_ID || factoryId === MANUAL_SOURCE_ID) {
    depotAmount = 0;
  } else {
    const source = state.factories.factories[factoryId ?? ''];
    if (source?.progress === 'disabled') {
      depotAmount = 0;
    } else {
      depotAmount = Math.max(
        source?.outputs
          ?.filter(o => o?.resource === output && o?.destination === 'depot')
          .reduce((sum, o) => sum + (o?.amount ?? 0), 0) ?? 0,
        0,
      );
    }
  }

  const usedAmount =
    state.games.games[state.games.selected ?? '']?.factoriesIds
      .map(id => state.factories.factories[id])
      .filter(f => f && f.progress !== 'disabled')
      .flatMap(f => f!.inputs)
      .filter(i => i?.resource === output && i?.factoryId === factoryId)
      .reduce((sum, i) => sum + Math.max(i?.amount ?? 0, 0), 0) ?? 0;

  let percentage = usedAmount / producedAmount;
  if (producedAmount === 0 && usedAmount !== 0) {
    percentage = Number.POSITIVE_INFINITY;
  }
  if (Number.isNaN(percentage)) {
    percentage = 0;
  }

  return { percentage, producedAmount, usedAmount, depotAmount };
}

export function useOutputUsage(
  options: Pick<IFactoryUsageProps, 'factoryId' | 'output'>,
) {
  return useShallowStore(state => computeOutputUsage(state, options));
}
