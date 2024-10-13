export interface FactoryRecipe {
  id: string;
  name: string;
  index: number;
  // description: string;
  // type: 'base' | 'alternate' | 'mam';
  tier?: number;
  cost?: string;
  ingredients: RecipeIngredient[];
  products: RecipeIngredient[];
  time: number;
  powerConsumption: number;
  powerConsumptionFactor: number;
  producedIn: string;
}

export interface RecipeIngredient {
  resource: string;
  amount: number;
  displayAmount: number; // Without LP fixes
  originalAmount?: number; // For liquids, it's in cubic centimeters (x1000)
}

import { AllFactoryItemsMap } from './FactoryItem';
import RawFactoryRecipes from './FactoryRecipes.json';
import { isWorldResource } from './WorldResources';

export const AllFactoryRecipes: FactoryRecipe[] =
  RawFactoryRecipes as FactoryRecipe[];

export const AllFactoryRecipesMap = AllFactoryRecipes.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<string, FactoryRecipe>,
);

export function isProducibleResource(resource: string) {
  return !NotProducibleItems.has(resource);
}

const ProducibleItems = new Set(
  AllFactoryRecipes.flatMap(r => r.products.map(p => p.resource)),
);
export const NotProducibleItems = new Set(
  Array.from(
    new Set(Object.keys(AllFactoryItemsMap)).difference(ProducibleItems),
  ).filter(r => !isWorldResource(r)),
);

export function getAllRecipesForItem(item: string) {
  const recipes = AllFactoryRecipes.filter(r =>
    r.products.some(p => p.resource === item),
  );
  return recipes;
}

export function getRecipeProductPerBuilding(
  recipe: FactoryRecipe,
  productId: string,
) {
  // console.log('recipe:', recipe, productId);
  const product = recipe.products.find(p => p.resource === productId)!;
  return (product.amount * 60) / recipe.time;
}

export function getRecipeDisplayName(recipe: FactoryRecipe) {
  const product = AllFactoryItemsMap[recipe.products[0].resource];
  const isAlt = recipe.name.includes('Alternate');
  return isAlt ? recipe.name.replace('Alternate: ', '') : product.displayName;
}
