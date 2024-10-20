import { Button, Checkbox, Group, ScrollArea, Stack } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useStore } from '@/core/zustand';
import { RecipeTooltip } from '@/recipes/ui/RecipeTooltip';
import { xor } from 'lodash';
import {
  AllFactoryRecipes,
  AllFactoryRecipesMap,
} from '../../../recipes/FactoryRecipe';
import { useSolverAllowedRecipes } from '../../store/solverSelectors';

export interface ISwitchRecipeActionProps {
  recipeId: string;
}

/**
 * Select alternate recipes for a given product
 */
export function SwitchRecipeAction(props: ISwitchRecipeActionProps) {
  const { recipeId } = props;
  const recipe = AllFactoryRecipesMap[recipeId];
  const recipes = useMemo(() => {
    return AllFactoryRecipes.filter(r =>
      r.products.some(
        product => product.resource === recipe.products[0].resource,
      ),
    );
  }, [recipe.products]);

  const solverId = useParams<{ id: string }>().id;
  const allAllowedRecipes = useSolverAllowedRecipes(solverId);

  const defaultAllowedRecipes = useMemo(() => {
    return (
      allAllowedRecipes?.filter(id => recipes.some(r => r.id === id)) ??
      recipes.map(r => r.id)
    );
  }, [allAllowedRecipes, recipes]);

  const [allowedRecipes, setAllowedRecipes] = useState<string[]>(
    defaultAllowedRecipes,
  );

  useEffect(() => {
    setAllowedRecipes(defaultAllowedRecipes);
  }, [defaultAllowedRecipes, recipes]);

  const isDisabled = xor(allowedRecipes, defaultAllowedRecipes).length === 0;

  return (
    <Checkbox.Group
      w="100%"
      labelProps={{ w: '100%' }}
      label={
        <Group justify="space-between">
          <span>Alternate recipes</span>
          <Button
            variant={isDisabled ? 'default' : 'filled'}
            color="blue"
            size="xs"
            disabled={isDisabled}
            onClick={() => {
              useStore
                .getState()
                .setAllowedRecipes(solverId!, all =>
                  all
                    ?.filter(id => !recipes.some(r => r.id === id))
                    .concat(allowedRecipes),
                );
            }}
          >
            Apply
          </Button>
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
