export interface FactoryRecipe {
  id: string;
  name: string;
  index: number;
  // description: string;
  // type: 'base' | 'alternate' | 'mam';
  tier?: number;
  cost?: string;
  ingredients: RecipeIngredient[];
  product: RecipeIngredient;
  time: number;
  powerConsumption: number;
  powerConsumptionFactor: number;
  producedIn: string;
}

export interface RecipeIngredient {
  resource: string;
  amount: number;
}

import RawFactoryRecipes from './FactoryRecipes.json';

export const AllFactoryRecipes: FactoryRecipe[] =
  RawFactoryRecipes as FactoryRecipe[];

export const AllFactoryRecipesMap = AllFactoryRecipes.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<string, FactoryRecipe>,
);
