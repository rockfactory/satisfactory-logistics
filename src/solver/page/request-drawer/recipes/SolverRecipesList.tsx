import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { AllFactoryRecipes, type FactoryRecipe } from '@/recipes/FactoryRecipe';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { useSolverAllowedRecipes } from '@/solver/store/solverSelectors';
import { Group, Stack, Text } from '@mantine/core';
import * as React from 'react';
import { useMemo } from 'react';
import { SolveRecipeCheckbox } from './SolverRecipeCheckbox';

export interface ISolverRecipesListProps {
  solverId: string | null | undefined;
  search?: string;
}

const AllRecipesGroupedByProduct = AllFactoryRecipes.reduce(
  (acc, recipe) => {
    const product = recipe.products[0].resource;
    if (!acc[product]) {
      acc[product] = [];
    }
    acc[product].push(recipe);
    return acc;
  },
  {} as Record<string, FactoryRecipe[]>,
);

export const SolverRecipesList = React.memo(
  (props: ISolverRecipesListProps) => {
    const { search, solverId } = props;
    const allowedRecipes = useSolverAllowedRecipes(solverId);

    const displayedProducts = useMemo(() => {
      return Object.entries(AllRecipesGroupedByProduct).filter(
        ([product, recipes]) =>
          search
            ? AllFactoryItemsMap[product].name
                .toLowerCase()
                .includes(search.toLowerCase()) ||
              recipes.some(recipe =>
                recipe.name.toLowerCase().includes(search.toLowerCase()),
              )
            : true,
      );
    }, [search]);

    return (
      <Stack gap="sm">
        {displayedProducts.map(([product, recipes]) => (
          <React.Fragment key={product}>
            <Group gap="xs">
              <Text key={product} size="md">
                {AllFactoryItemsMap[product].displayName}
              </Text>
              <FactoryItemImage id={product} size={20} />
            </Group>
            {recipes.map(recipe => (
              <SolveRecipeCheckbox
                key={recipe.id}
                recipe={recipe}
                solverId={solverId!}
                checked={allowedRecipes?.includes(recipe.id) ?? true}
              />
            ))}
          </React.Fragment>
        ))}
      </Stack>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.search === nextProps.search &&
      prevProps.solverId === nextProps.solverId
    );
  },
);
