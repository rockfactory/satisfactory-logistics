import { MultiSelect } from '@mantine/core';
import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  AllFactoryRecipes,
  AllFactoryRecipesMap,
} from '../../../FactoryRecipe';
import {
  solverActions,
  usePathSolverAllowedRecipes,
} from '../../store/SolverSlice';

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
  }, [recipeId]);

  const dispatch = useDispatch();
  const solverId = useParams<{ id: string }>().id;
  const allAllowedRecipes = usePathSolverAllowedRecipes();
  const handleSelectRecipe = (recipeId: string) => {
    console.log('Switching to recipe', recipeId);
  };

  return (
    <MultiSelect
      w="200px"
      label="Alternate recipe"
      placeholder="Select recipes"
      data={recipes.map(recipe => ({ value: recipe.id, label: recipe.name }))}
      searchable
      value={recipes
        .map(recipe => recipe.id)
        .filter(id => allAllowedRecipes?.includes(id))}
      onChange={selected => {
        dispatch(
          solverActions.updateAtPath({
            id: solverId,
            path: 'request.allowedRecipes',
            value: allAllowedRecipes
              ?.filter(id => !recipes.map(recipe => recipe.id).includes(id))
              .concat(selected),
          }),
        );
      }}
    />
  );
}
