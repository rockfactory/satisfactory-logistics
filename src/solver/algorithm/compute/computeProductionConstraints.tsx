import { last } from 'lodash';
import { log } from '@/core/logger/log';
import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { getAllRecipesForItem } from '@/recipes/FactoryRecipe';
import { isWorldResource } from '@/recipes/WorldResources';
import {
  type SolverContext,
  setGraphByproduct,
  setGraphResource,
} from '@/solver/algorithm/SolverContext';
import type { SolverOutputNode } from '@/solver/algorithm/SolverNode';

const logger = log.getLogger('recipes:solver');
logger.setLevel('info');

/**
 * Recursively compute the constraints for a given resource, given
 * the available recipes.
 */
export function computeProductionConstraints(
  ctx: SolverContext,
  resource: string,
  amount?: number,
) {
  logger.debug('Processing recipes for: ', resource);

  const resourceItem = AllFactoryItemsMap[resource];
  const recipes = getAllRecipesForItem(resource);
  const rawVar = `r${resourceItem.index}`;
  if (isWorldResource(resource) && !ctx.graph.hasNode(rawVar)) {
    logger.debug('Adding raw resource:', resource);
    setGraphResource(ctx, resource);
    ctx.graph.mergeNode(rawVar, {
      type: 'raw',
      label: resource,
      resource: resourceItem,
      variable: rawVar,
    });
    ctx.graph.mergeEdge(rawVar, resource);
  }

  for (const recipe of recipes) {
    if (!ctx.isRecipeAllowed(recipe.id)) continue;
    if (!ctx.isRecipeProducedInAllowedBuilding(recipe)) continue;
    if (ctx.processedRecipes.has(recipe.id)) continue;
    ctx.processedRecipes.add(recipe.id);
    const mainProductItem = AllFactoryItemsMap[recipe.products[0].resource];
    const mainProductVar = `p${mainProductItem.index}r${recipe.index}`;
    const mainProductAmount = (recipe.products[0].amount * 60) / recipe.time;
    logger.debug(' Processing recipe:', recipe.name, { mainProductItem, recipe }); // prettier-ignore

    // const buildingsVar = `c${recipe.index}`;
    const building = AllFactoryBuildingsMap[recipe.producedIn];

    // 1. Energy consumption. Used for minimization
    const recipeEnergyVar = `e${recipe.index}`;
    ctx.graph.mergeNode(recipeEnergyVar, {
      type: 'energy',
      label: `Energy: ${recipe.name}`,
      recipe,
      variable: recipeEnergyVar,
    });
    // TODO No edge for now. We don't need it for minimization
    const energyConsumptionFactor =
      building.averagePowerConsumption / mainProductAmount;

    const somersloops = ctx.request?.nodes?.[mainProductVar]?.somersloops ?? 0;
    const overclock = ctx.request?.nodes?.[mainProductVar]?.overclock ?? 1;

    ctx.constraints.push(
      `${recipeEnergyVar} - ${energyConsumptionFactor} ${mainProductVar} = 0`,
    );

    // 2. Building Area
    const recipeAreaVar = `area${recipe.index}`;
    ctx.graph.mergeNode(recipeAreaVar, {
      type: 'area',
      variable: recipeAreaVar,
    });
    const areaFactor =
      // Space occupied by the building
      (building.clearance.width * building.clearance.length) /
      // How many products produced in a minute by the building
      mainProductAmount;

    ctx.constraints.push(
      `${recipeAreaVar} - ${areaFactor} ${mainProductVar} >= 0`,
    );
    ctx.constraints.push(
      // Atleast one building
      `${recipeAreaVar} >= ${building.clearance.width * building.clearance.length}`,
    );

    // 3. Ingredients
    for (const ingredient of recipe.ingredients) {
      // logger.debug('  Processing ingredient:', ingredient.resource);
      const ingredientItem = AllFactoryItemsMap[ingredient.resource];
      const recipeIngredientVar = `i${ingredientItem.index}r${recipe.index}`;
      setGraphResource(ctx, ingredient.resource);
      ctx.graph.addNode(recipeIngredientVar, {
        type: 'input',
        label: `Ingredient: ${ingredientItem.displayName} (${recipe.name})`,
        recipe,
        resource: ingredientItem,
        variable: recipeIngredientVar,
        recipeMainProductVariable: mainProductVar,
      });
      ctx.graph.mergeEdge(ingredient.resource, recipeIngredientVar);
      ctx.graph.mergeEdge(recipeIngredientVar, mainProductVar);
    }

    for (const product of recipe.products) {
      // logger.debug('  Processing product:', product.resource);
      const isMain = product.resource === recipe.products[0].resource;

      const productItem = AllFactoryItemsMap[product.resource];
      const recipeProductVar = `p${productItem.index}r${recipe.index}`;
      const recipeOriginalProductVar = `p${productItem.index}r${recipe.index}o`;
      const recipeAmplifiedProductVar = `p${productItem.index}r${recipe.index}a`;
      const recipeByproductVar = `b${productItem.index}r${recipe.index}`;
      setGraphResource(ctx, product.resource);
      ctx.graph.mergeNode(recipeProductVar, {
        type: 'output',
        label: `Product: ${productItem.displayName} (${recipe.name})`,
        recipe,
        resource: productItem,
        variable: recipeProductVar,
        amplifiedVariable: recipeAmplifiedProductVar,
        originalVariable: recipeOriginalProductVar,
        recipeMainProductVariable: mainProductVar,
        byproductVariable: recipeByproductVar,
      } as SolverOutputNode);
      ctx.graph.mergeEdge(recipeProductVar, product.resource);
      const productAmount = (product.amount * 60) / recipe.time;

      // Sloop
      ctx.constraints.push(
        `${recipeProductVar} - ${recipeAmplifiedProductVar} - ${recipeOriginalProductVar} = 0`,
      );

      if (somersloops > 0) {
        const productAmountPerSloop =
          (productAmount / building.somersloopSlots) * overclock;
        ctx.constraints.push(
          `${recipeAmplifiedProductVar} - ${recipeOriginalProductVar} <= 0`,
        );
        ctx.bounds.push(
          `${recipeAmplifiedProductVar} <= ${somersloops * productAmountPerSloop}`,
        );
        logger.info('  Adding somersloops:', recipe.name, productAmountPerSloop, last(ctx.constraints)); // prettier-ignore
      } else {
        ctx.constraints.push(`${recipeAmplifiedProductVar} = 0`);
      }

      // Byproduct
      setGraphByproduct(ctx, product.resource);
      ctx.graph.mergeEdgeWithKey(
        recipeByproductVar,
        recipeProductVar,
        `b${productItem.index}`,
      );

      if (!isMain) {
        ctx.graph.mergeEdge(mainProductVar, recipeProductVar); // Debug

        const factor = mainProductAmount / productAmount;
        ctx.constraints.push(
          // TODO Enhance variable name.
          `${factor} ${recipeOriginalProductVar} - ${mainProductVar}o = 0`,
        );
        // logger.debug(
        //   '  Adding constraint:',
        //   `${factor} ${recipeProductVar} - ${mainProductVar} = 0`,
        // );
      }

      for (const ingredient of recipe.ingredients) {
        const ingredientItem = AllFactoryItemsMap[ingredient.resource];
        const recipeIngredientVar = `i${ingredientItem.index}r${recipe.index}`;
        const ingredientAmount = (ingredient.amount * 60) / recipe.time;
        const factor = productAmount / ingredientAmount;

        ctx.constraints.push(
          `${factor} ${recipeIngredientVar} - ${recipeOriginalProductVar} = 0`,
        );

        computeProductionConstraints(ctx, ingredient.resource);
      }
    }
  }
}
