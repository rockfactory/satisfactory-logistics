import { log } from '@/core/logger/log';
import type { FactoryOutput } from '@/factories/Factory';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { computeProductionConstraints } from '@/solver/algorithm/compute/computeProductionConstraints';
import {
  type SolverContext,
  setGraphByproduct,
  setGraphResource,
} from '@/solver/algorithm/SolverContext';

const logger = log.getLogger('recipes:solver');
logger.setLevel('info');

/**
 * Compute the constraints for a given output resource.
 */
export function addOutputProductionConstraints(
  ctx: SolverContext,
  output: FactoryOutput,
  outputIndex: number,
) {
  const { resource, amount, objective } = output;
  if (!resource) {
    logger.error('Missing resource in output', output);
    return;
  }

  const resourceItem = AllFactoryItemsMap[resource];

  setGraphResource(ctx, resource);
  setGraphByproduct(ctx, resource, { output, outputIndex });

  const byproductVar = `b${resourceItem.index}`;

  // Depending on the objective, we can set the amount as a minimum
  // or as a fixed value.
  switch (objective) {
    case 'max':
      // Here we just add a lower bound, maximization is handled by the objective
      // function
      ctx.constraints.push(`${byproductVar} >= ${amount || 0}`);
      break;
    case 'default':
    default:
      ctx.constraints.push(`${byproductVar} = ${amount || 0}`);
  }

  computeProductionConstraints(ctx, resource);
}
