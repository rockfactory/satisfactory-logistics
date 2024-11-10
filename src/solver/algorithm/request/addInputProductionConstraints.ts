import type { FactoryInput } from '@/factories/Factory';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { type SolverContext, setGraphResource } from '../SolverContext';

/**
 * Compute the constraints for a given input resource.
 */
export function addInputResourceConstraints(
  ctx: SolverContext,
  input: FactoryInput,
  inputIndex: number,
) {
  const { resource, amount, constraint } = input;
  setGraphResource(ctx, resource!);
  const resourceItem = AllFactoryItemsMap[resource!];
  const inputVar = `ri${resourceItem.index}i${inputIndex}`;
  ctx.graph.mergeNode(inputVar, {
    type: 'raw_input',
    label: resource!,
    resource: resourceItem,
    variable: inputVar,
    input,
    inputIndex,
  });
  ctx.graph.mergeEdge(inputVar, resource!);

  const normalizedConstraint = constraint ?? 'max';

  // If the resource is forced, we need to add a constraint to be _exactly_ the amount
  switch (normalizedConstraint) {
    case 'exact':
      ctx.constraints.push(`${inputVar} = ${amount || 0}`);
      break;

    case 'max':
    default:
      // If the resource is a factory input, we need to add a constraint to be
      // _max_ the amount. This is because else the `rawVar` will not have
      // an Upper Bound and the solver will not be able to solve the problem.
      ctx.constraints.push(`${inputVar} <= ${amount || 0}`);
  }

  // If the resource is a factory input, we need to add a constraint to be
  //  _exactly_ the amount
  // if (normalizedConstraint === 'none' && !isWorldResource(resource!)) {
  //   ctx.constraints.push(`${rawVar} <= ${amount ?? 0}`);
  // }
  // if () {
  //   ctx.constraints.push(`${rawVar} = ${amount ?? 0}`);
  // } else if (!isWorldResource(resource!)) {
  //   ctx.constraints.push(`${rawVar} <= ${amount ?? 0}`);
  // }
  // ctx.constraints.push(`${rawVar} - ${amount ?? 0} >= 0`);
}
