import {
  WORLD_SOURCE_ID,
  type Factory,
  type FactoryInput,
} from '@/factories/Factory';
import { isWorldResource } from '@/recipes/WorldResources';
import type { IResourceNodeData } from '@/solver/layout/nodes/resource-node/ResourceNode';
import type { ISolverSolution } from '@/solver/page/SolverPage';
import type { Node } from '@xyflow/react';
import { sortBy } from 'lodash';

export function computeAutoSetInputs(
  solution: ISolverSolution,
  factory: Pick<Factory, 'inputs'>,
): FactoryInput[] {
  const prevInputs = factory.inputs ?? [];
  const nextInputs = [] as FactoryInput[];

  const inputNodes = sortBy(
    solution.nodes.filter(
      (n): n is Node<IResourceNodeData, 'Resource'> => n.type === 'Resource',
    ),
    n => n.data.resource.displayName,
  );
  for (const node of inputNodes) {
    const nextInput = nextInputs.find(
      i => i.resource === node.data.resource.id,
    );
    const input = prevInputs.find(i => i.resource === node.data.resource.id);
    if (nextInput) {
      nextInput.amount = (nextInput.amount ?? 0) + node.data.value;
    } else if (input) {
      nextInputs.push({
        ...input,
        amount: node.data.value,
      });
    } else {
      nextInputs.push({
        resource: node.data.resource.id,
        amount: node.data.value,
        factoryId: isWorldResource(node.data.resource.id)
          ? WORLD_SOURCE_ID
          : undefined,
      });
    }
  }

  return nextInputs;
}
