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
      // No lower bound needed — amount holds the solver-computed result,
      // not a user constraint. Maximization is handled by the objective function.
      ctx.constraints.push(`${byproductVar} >= 0`);
      break;
    case 'default':
    default:
      // `>=` Allows maximization on one byproduct in a recipe which has TWO outputs
      // (one maximized, one not).
      // theoretically, this could have some issues if the solver decides to produce
      // a lot of the non-maximized output, but in practice it should not since inputs are a _cost_.
      //
      // We could use >= only if there is another output with a max objective, but that would
      // add complexity and edge cases.
      ctx.constraints.push(`${byproductVar} >= ${amount || 0}`);
  }

  computeProductionConstraints(ctx, resource);
}
