import { Checkbox, Group, ScrollArea, Stack } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { RecipeTooltip } from '@/recipes/ui/RecipeTooltip';
import { xor } from 'lodash';
import {
  AllFactoryRecipes,
  AllFactoryRecipesMap,
  type FactoryRecipe,
} from '../../../recipes/FactoryRecipe';
import { useSolverAllowedRecipes } from '../../store/solverSelectors';

export interface ISwitchRecipeActionProps {
  recipeId: string;
  /** All recipes for this specific recipe */
  recipes: FactoryRecipe[];
  allowedRecipes: string[];
  setAllowedRecipes: (ids: string[]) => void;
}

export function useRecipeAlternatesInputState(recipeId: string) {
  const solverId = useParams<{ id: string }>().id;
  const allAllowedRecipes = useSolverAllowedRecipes(solverId);

  const recipe = AllFactoryRecipesMap[recipeId];

  // All the recipes that produce the same product (alternate recipes).
  // These are the _saved_ recipes, not the input state.
  const recipes = useMemo(() => {
    return AllFactoryRecipes.filter(r =>
      r.products.some(
        product => product.resource === recipe.products[0].resource,
      ),
    );
  }, [recipe.products]);

  const defaultAllowedRecipes = useMemo(() => {
    return (
      allAllowedRecipes?.filter(id => recipes.some(r => r.id === id)) ??
      recipes.map(r => r.id)
    );
  }, [allAllowedRecipes, recipes]);

  const [allowedRecipes, setAllowedRecipes] = useState<string[]>(
    defaultAllowedRecipes,
  );

  // TODO We can probably remove this effect, since the input is re-rendered
  // when applying the changes.
  useEffect(() => {
    setAllowedRecipes(defaultAllowedRecipes);
  }, [defaultAllowedRecipes, recipes]);

  return {
    recipes,
    allowedRecipes,
    setAllowedRecipes,
    changed: xor(allowedRecipes, defaultAllowedRecipes).length !== 0,
  };
}

/**
 * Select alternate recipes for a given product
 */
export function SwitchRecipeAction(props: ISwitchRecipeActionProps) {
  const { recipeId, allowedRecipes, setAllowedRecipes, recipes } = props;

  return (
    <Checkbox.Group
      w="100%"
      labelProps={{ w: '100%' }}
      label={
        <Group justify="space-between">
          <span>Alternate recipes</span>
        </Group>
      }
      value={allowedRecipes}
      onChange={ids => {
        setAllowedRecipes(ids);
      }}
    >
      <ScrollArea.Autosize mah={200} mx="auto">
        <Stack gap="xs">
          {recipes.map(r => (
            <Checkbox
              size="xs"
              key={r.id}
              value={r.id}
              label={
                <RecipeTooltip key={r.id} recipeId={r.id}>
                  <span>{r.name}</span>
                </RecipeTooltip>
              }
            />
          ))}
        </Stack>
      </ScrollArea.Autosize>
    </Checkbox.Group>
  );
}
