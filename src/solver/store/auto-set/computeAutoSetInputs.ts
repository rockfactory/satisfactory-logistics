import {
  WORLD_SOURCE_ID,
  type Factory,
  type FactoryInput,
} from '@/factories/Factory';
import { isWorldResource } from '@/recipes/WorldResources';
import { isResourceNode } from '@/solver/algorithm/getSolutionNodes';
import type { ISolverSolution } from '@/solver/page/SolverPage';
import { sortBy } from 'lodash';
import { fixSolverRoundingError } from './fixSolverRoundingError';

export function computeAutoSetInputs(
  solution: ISolverSolution,
  factory: Pick<Factory, 'inputs'>,
): FactoryInput[] {
  const prevInputs = factory.inputs ?? [];
  const nextInputs = [] as FactoryInput[];

  const inputNodes = sortBy(
    solution.nodes.filter(isResourceNode),
    n => n.data.resource.displayName,
  );
  for (const node of inputNodes) {
    const nodeAmount = fixSolverRoundingError(node.data.value);

    const nextInput = nextInputs.find(
      i => i.resource === node.data.resource.id,
    );
    const input = prevInputs.find(i => i.resource === node.data.resource.id);
    if (nextInput) {
      nextInput.amount = (nextInput.amount ?? 0) + nodeAmount;
    } else if (input) {
      nextInputs.push({
        ...input,
        amount: nodeAmount,
      });
    } else {
      nextInputs.push({
        resource: node.data.resource.id,
        amount: nodeAmount,
        factoryId: isWorldResource(node.data.resource.id)
          ? WORLD_SOURCE_ID
          : undefined,
      });
    }
  }

  return nextInputs;
}
