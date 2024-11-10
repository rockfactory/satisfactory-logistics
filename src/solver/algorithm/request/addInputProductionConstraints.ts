import type { FactoryInput } from '@/factories/Factory';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { isWorldResource } from '@/recipes/WorldResources';
import { type SolverContext, setGraphResource } from '../SolverContext';

/**
 * Compute the constraints for a given input resource.
 */
export function addInputResourceConstraints(
  ctx: SolverContext,
  { resource, amount, constraint }: FactoryInput,
  inputIndex: number,
) {
  setGraphResource(ctx, resource!);
  const resourceItem = AllFactoryItemsMap[resource!];
  const rawVar = isWorldResource(resource!)
    ? `r${resourceItem.index}`
    : `ri${resourceItem.index}i${inputIndex}`;
  ctx.graph.mergeNode(rawVar, {
    type: isWorldResource(resource!) ? 'raw' : 'raw_input',
    label: resource!,
    resource: resourceItem,
    variable: rawVar,
    constraint,
    inputIndex,
  });
  ctx.graph.mergeEdge(rawVar, resource!);

  const normalizedConstraint = constraint ?? 'max';

  // TODO: Gestire input = null che non si resetta a 0

  // If the resource is forced, we need to add a constraint to be _exactly_ the amount
  switch (normalizedConstraint) {
    case 'exact':
      ctx.constraints.push(`${rawVar} = ${amount || 0}`);
      break;

    case 'max':
    default:
      // If the resource is a factory input, we need to add a constraint to be
      // _max_ the amount. This is because else the `rawVar` will not have
      // an Upper Bound and the solver will not be able to solve the problem.
      if (!isWorldResource(resource!)) {
        ctx.constraints.push(`${rawVar} <= ${amount || 0}`);
      }
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
