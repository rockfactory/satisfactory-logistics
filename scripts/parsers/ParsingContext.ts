import type { FactoryBuilding } from '@/recipes/FactoryBuilding';
import type { FactoryItem } from '@/recipes/FactoryItem';
import type { FactoryRecipe } from '@/recipes/FactoryRecipe';
import fs from 'fs';

export interface ParsingContext {
  itemsMap: Record<string, FactoryItem>;
  buildings: FactoryBuilding[];
  recipes: FactoryRecipe[];
  images: Array<{
    resourcePath: string;
    imageName: string;
  }>;
  /**
   * Get the index of a recipe by its ID.
   * In case the recipe is not found, it will return the next available index.
   * Instead, if the recipe was already indexed in a _previous_ run, it will return
   * the previous index, so we can keep the index consistent across runs.
   */
  getRecipeIndex: (id: string) => number;
}

const previousRecipes = JSON.parse(
  fs.readFileSync('./src/recipes/FactoryRecipes.json', 'utf-8'),
);
const previousRecipesIndexes = previousRecipes.reduce((acc, recipe) => {
  acc[recipe.id] = recipe.index;
  return acc;
}, {});

let nextRecipesIndex = Math.max(...previousRecipes.map(r => r.index), 0) + 1;

export const ParsingContext: ParsingContext = {
  itemsMap: {},
  buildings: [],
  recipes: [],
  images: [],
  getRecipeIndex: (id: string) => {
    if (previousRecipesIndexes[id] != null) {
      return previousRecipesIndexes[id];
    }
    return nextRecipesIndex++;
  },
};
