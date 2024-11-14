import { itemId } from '@/recipes/itemId';
import type {
  SolverInputNode,
  SolverOutputNode,
  SolverRawInputNode,
  SolverRawNode,
} from '@/solver/algorithm/SolverNode';

/**
 * We want to avoid links between packagers and unpackagers, as they are
 * effectively useless.
 */
export function isLinkBetweenPackagerAndUnpackager(
  inbound: SolverOutputNode | SolverRawNode | SolverRawInputNode,
  outbound: SolverInputNode,
) {
  if (inbound.type !== 'output') return false;

  // return false;

  const inboundIngredientsWithoutCanisters = inbound.recipe.ingredients.filter(
    i => i.resource !== itemId('Desc_FluidCanister_C'),
  );
  const outboundProductsWithoutCanisters = outbound.recipe.products.filter(
    p => p.resource !== itemId('Desc_FluidCanister_C'),
  );

  if (
    outbound.recipe.producedIn === 'Build_Packager_C' &&
    inbound.recipe.producedIn === 'Build_Packager_C' &&
    inboundIngredientsWithoutCanisters.length === 1 &&
    outboundProductsWithoutCanisters.length === 1 &&
    inboundIngredientsWithoutCanisters[0].resource ===
      outboundProductsWithoutCanisters[0].resource
  )
    return true;

  return false;
}
