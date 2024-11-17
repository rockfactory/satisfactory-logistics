import type { FactoryItemId } from './FactoryItemId';
import type { FactoryRecipeId } from './FactoryRecipeId';

export function itemId<T extends FactoryItemId>(id: T): T {
  return id;
}

export function recipeId<T extends FactoryRecipeId>(id: T): T {
  return id;
}
