import type { FactoryBuilding } from '@/recipes/FactoryBuilding';
import type { FactoryItem } from '@/recipes/FactoryItem';
import type { FactoryRecipe } from '@/recipes/FactoryRecipe';

export interface ParsingContext {
  itemsMap: Record<string, FactoryItem>;
  buildings: FactoryBuilding[];
  recipes: FactoryRecipe[];
  images: Array<{
    resourcePath: string;
    imageName: string;
  }>;
}

export const ParsingContext: ParsingContext = {
  itemsMap: {},
  buildings: [],
  recipes: [],
  images: [],
};
