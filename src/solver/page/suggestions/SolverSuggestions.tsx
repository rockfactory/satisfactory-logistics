import { useStore } from '@/core/zustand';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { AllFactoryRecipesMap } from '@/recipes/FactoryRecipe';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import type { SolverInstance } from '@/solver/store/Solver';
import { Button, Group, Text } from '@mantine/core';
import { IconArrowBack, IconPlus, IconRestore } from '@tabler/icons-react';
import type { ISolverSolutionSuggestion } from './proposeSolverSolutionSuggestions';

export interface ISolverSuggestionsProps {
  instance: SolverInstance;
  suggestions: ISolverSolutionSuggestion | null;
}

/**
 * Displays suggestions for the solver.
 */
export function SolverSuggestions(props: ISolverSuggestionsProps) {
  const { suggestions, instance } = props;

  return (
    <>
      {suggestions?.addRecipes && (
        <>
          <Text size="sm" c="dark.2">
            Try adding the following recipes:
          </Text>
          <Group gap="xs">
            {suggestions.addRecipes.map(recipeId => {
              const recipe = AllFactoryRecipesMap[recipeId];
              const mainProduct =
                AllFactoryItemsMap[recipe.products[0].resource];
              return (
                <Button
                  key={recipeId}
                  variant="default"
                  size="sm"
                  onClick={() => {
                    useStore
                      .getState()
                      .toggleRecipe(instance.id!, { recipeId });
                  }}
                  leftSection={<IconPlus size={16} />}
                  rightSection={
                    <FactoryItemImage size={16} id={mainProduct.id} />
                  }
                >
                  {recipe.name}
                </Button>
              );
            })}
          </Group>
        </>
      )}
      {suggestions?.resetOutputMinimum && (
        <>
          <Text size="sm" c="dark.2">
            Try removing the <b>output minimums</b>. When maximizing, the output
            amount is used as a minimum.
          </Text>
          <Group gap="xs">
            {suggestions.resetOutputMinimum.map(({ index, resource }) => {
              const item = AllFactoryItemsMap[resource];
              return (
                <Button
                  key={resource}
                  variant="default"
                  size="sm"
                  onClick={() => {
                    useStore
                      .getState()
                      .updateFactoryOutput(instance.id!, index, {
                        amount: 0,
                      });
                  }}
                  leftSection={<IconRestore size={16} />}
                  rightSection={<FactoryItemImage size={16} id={item.id} />}
                >
                  Reset minimum for {item.displayName}
                </Button>
              );
            })}
          </Group>
        </>
      )}
      {suggestions?.unblockResources && (
        <>
          <Text size="sm" c="dark.2">
            Try removing the limitations for the following resources:
          </Text>
          <Group gap="xs">
            {suggestions.unblockResources.map(resource => {
              const item = AllFactoryItemsMap[resource];
              return (
                <Button
                  key={resource}
                  variant="default"
                  size="sm"
                  onClick={() => {
                    useStore
                      .getState()
                      .toggleBlockedResource(instance.id!, resource, false);
                  }}
                  leftSection={<IconArrowBack size={16} />}
                  rightSection={<FactoryItemImage size={16} id={item.id} />}
                >
                  Allow {item.displayName}
                </Button>
              );
            })}
          </Group>
        </>
      )}
    </>
  );
}
