import { loglev } from '@/core/logger/log';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { AllFactoryRecipesMap } from '@/recipes/FactoryRecipe';
import { itemId, recipeId } from '@/recipes/itemId';
import type { SolverContext } from '@/solver/algorithm/SolverContext';

const logger = loglev.getLogger('solver:avoid-packaged-fuel');

export function avoidPackagedFuelIfPossible(ctx: SolverContext) {
  // The goal is to avoid using Packaged Fuel if possible.
  // We can do this by creating a new objective that minimizes the amount of Packaged Fuel used.

  // This is needed only if the Diluted Fuel recipe is available, since they are equivalent resource-wise.
  if (!ctx.isRecipeAllowed(recipeId('Recipe_Alternate_DilutedFuel_C'))) return;

  // Find the Packaged Fuel recipe
  const fuelItem = AllFactoryItemsMap[itemId('Desc_Fuel_C')];
  const packagedFuelRecipe =
    AllFactoryRecipesMap[recipeId('Recipe_Alternate_DilutedPackagedFuel_C')];

  const packagedFuelNodeId = `p${fuelItem.index}r${packagedFuelRecipe.index}`;
  if (!ctx.graph.hasNode(packagedFuelNodeId)) return;

  logger.info('Avoiding Packaged Fuel if possible');
  ctx.addMinimizeExpressions(`${20 / 1_000_000_000} ${packagedFuelNodeId}`);
}
