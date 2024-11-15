import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { NotProducibleItems } from '@/recipes/FactoryRecipe';
import type { SolverContext } from '@/solver/algorithm/SolverContext';

export function avoidUnproducibleResources(ctx: SolverContext) {
  NotProducibleItems.forEach(resource => {
    ctx.bounds.push(`p${AllFactoryItemsMap[resource].index} = 0`);
  });
}
