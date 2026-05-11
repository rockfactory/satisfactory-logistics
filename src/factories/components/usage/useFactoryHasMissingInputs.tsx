import { useStore } from '@/core/zustand';
import { MANUAL_SOURCE_ID } from '@/factories/Factory';
import { computeOutputUsage } from './useOutputUsage';

/**
 * Returns true when any of the factory's inputs is under-supplied by its
 * source factory (mirrors the condition used by FactoryInputRow to show
 * the "Missing X" indicator).
 */
export function useFactoryHasMissingInputs(factoryId: string) {
  return useStore(state => {
    const factory = state.factories.factories[factoryId];
    if (!factory || factory.progress === 'disabled') return false;

    const inputs = factory.inputs ?? [];
    return inputs.some(input => {
      if (!input?.resource || !input?.factoryId) return false;
      if (input.factoryId === MANUAL_SOURCE_ID) return false;
      const { percentage } = computeOutputUsage(state, {
        factoryId: input.factoryId,
        output: input.resource,
      });
      return percentage > 1;
    });
  });
}
