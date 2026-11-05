import { type RootState, useStore } from '@/core/zustand';
import {
  type FactoryOutput,
  MANUAL_SOURCE_ID,
  WORLD_SOURCE_ID,
} from '@/factories/Factory';
import { getWorldResourceMax } from '@/recipes/WorldResources';
import type { IFactoryUsageProps } from './FactoryUsage';

type UsageOptions = Pick<IFactoryUsageProps, 'factoryId' | 'output'>;

/** Builds a predicate matching outputs of `resource` on the given side of the depot split. */
function isMatchingOutput(
  resource: string | null | undefined,
  toDepot: boolean,
) {
  return (output: FactoryOutput | undefined) =>
    output?.resource === resource &&
    (output?.destination === 'depot') === toDepot;
}

function sumOutputAmounts(sum: number, output: FactoryOutput | undefined) {
  return sum + (output?.amount ?? 0);
}

function selectSourceAmount(
  state: RootState,
  options: UsageOptions,
  toDepot: boolean,
) {
  const source = state.factories.factories[options.factoryId ?? ''];
  if (source?.progress === 'disabled') return 0;
  return Math.max(
    source?.outputs
      ?.filter(isMatchingOutput(options.output, toDepot))
      .reduce(sumOutputAmounts, 0) ?? 0,
    0,
  );
}

export function selectProducedAmount(state: RootState, options: UsageOptions) {
  if (options.factoryId === WORLD_SOURCE_ID) {
    return getWorldResourceMax(options.output);
  }
  if (options.factoryId === MANUAL_SOURCE_ID) {
    // Manual inputs are user-supplied: no producer-side cap to enforce.
    return Number.POSITIVE_INFINITY;
  }
  return selectSourceAmount(state, options, false);
}

export function selectDepotAmount(state: RootState, options: UsageOptions) {
  if (
    options.factoryId === WORLD_SOURCE_ID ||
    options.factoryId === MANUAL_SOURCE_ID
  ) {
    return 0;
  }
  return selectSourceAmount(state, options, true);
}

export function selectUsedAmount(state: RootState, options: UsageOptions) {
  return (
    state.games.games[state.games.selected ?? '']?.factoriesIds
      .map(id => state.factories.factories[id])
      .filter(f => f && f.progress !== 'disabled')
      .flatMap(f => f!.inputs)
      .filter(
        i =>
          i?.resource === options.output && i?.factoryId === options.factoryId,
      )
      .reduce((sum, i) => sum + Math.max(i?.amount ?? 0, 0), 0) ?? 0
  );
}

export function computeUsagePercentage(
  usedAmount: number,
  producedAmount: number,
) {
  let percentage = usedAmount / producedAmount;
  if (producedAmount === 0 && usedAmount !== 0) {
    percentage = Number.POSITIVE_INFINITY;
  }
  if (Number.isNaN(percentage)) {
    percentage = 0;
  }
  return percentage;
}

/** True when usage is strictly above 100% (Infinity included). */
export function isOverused(percentage: number) {
  return percentage > 1 + Number.EPSILON;
}

export function selectOutputUsagePercentage(
  state: RootState,
  options: UsageOptions,
) {
  return computeUsagePercentage(
    selectUsedAmount(state, options),
    selectProducedAmount(state, options),
  );
}

export function useOutputUsage(options: UsageOptions) {
  const producedAmount = useStore(state =>
    selectProducedAmount(state, options),
  );
  const depotAmount = useStore(state => selectDepotAmount(state, options));
  const usedAmount = useStore(state => selectUsedAmount(state, options));
  const percentage = computeUsagePercentage(usedAmount, producedAmount);

  return { percentage, producedAmount, usedAmount, depotAmount };
}

/**
 * True when any of the factory's inputs draws from a source output that is
 * used above 100%. Disabled factories never report overuse.
 */
export function useFactoryHasOverusedInput(factoryId: string) {
  return useStore(state => {
    const factory = state.factories.factories[factoryId];
    if (!factory || factory.progress === 'disabled') return false;
    return (factory.inputs ?? []).some(
      input =>
        input?.factoryId &&
        input?.resource &&
        isOverused(
          selectOutputUsagePercentage(state, {
            factoryId: input.factoryId,
            output: input.resource,
          }),
        ),
    );
  });
}
