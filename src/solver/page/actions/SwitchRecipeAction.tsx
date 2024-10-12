import { MultiSelect } from '@mantine/core';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import {
  AllFactoryRecipes,
  AllFactoryRecipesMap,
} from '../../../recipes/FactoryRecipe';
import { useSolverAllowedRecipes } from '../../store/solverSelectors';

export interface ISwitchRecipeActionProps {
  recipeId: string;
}

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

  return (
    <MultiSelect
      w="200px"
      label="Alternate recipe"
      placeholder="Select recipes"
      data={recipes.map(recipe => ({ value: recipe.id, label: recipe.name }))}
      searchable
      value={recipes
        .map(recipe => recipe.id)
        .filter(
          id => allAllowedRecipes?.includes(id) || allAllowedRecipes === null,
        )}
      // TODO Enhanche this. Right now it's sync, not good
      // onChange={selected => {
      //   dispatch(
      //     solverActions.updateAtPath({
      //       id: solverId,
      //       path: 'request.allowedRecipes',
      //       value: allAllowedRecipes
      //         ?.filter(id => !recipes.map(recipe => recipe.id).includes(id))
      //         .concat(selected),
      //     }),
      //   );
      // }}
    />
  );
}
