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

  switch (objective) {
    case 'max':
      // For maximization, don't use the user-entered amount as a lower bound —
      // it may be infeasible. The solver will maximize this variable via the
      // objective function; any nonzero floor just risks infeasibility.
      ctx.constraints.push(`${byproductVar} >= 0`);
      break;
    case 'default':
    default:
      ctx.constraints.push(`${byproductVar} = ${amount || 0}`);
  }

  computeProductionConstraints(ctx, resource);
}
