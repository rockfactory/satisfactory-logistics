import { useStore } from '@/core/zustand';
import type { FactoryRecipe } from '@/recipes/FactoryRecipe';
import { RecipeTooltip } from '@/recipes/ui/RecipeTooltip';
import { Checkbox } from '@mantine/core';
import * as React from 'react';

export interface ISolveRecipeCheckboxProps {
  recipe: FactoryRecipe;
  solverId: string;
  checked: boolean;
}

export const SolveRecipeCheckbox = React.memo(
  (props: ISolveRecipeCheckboxProps) => {
    const { recipe, checked, solverId } = props;
    return (
      <Checkbox
        key={recipe.id}
        label={
          <RecipeTooltip recipeId={recipe.id}>{recipe.name}</RecipeTooltip>
        }
        checked={checked}
        onChange={e => {
          useStore.getState().toggleRecipe(solverId, {
            recipeId: recipe.id,
            use: e.currentTarget.checked,
          });
        }}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.recipe === nextProps.recipe &&
      prevProps.checked === nextProps.checked
    );
  },
);
