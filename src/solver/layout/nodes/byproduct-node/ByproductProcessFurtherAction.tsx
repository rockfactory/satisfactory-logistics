import { Button, Group, ScrollArea, Stack, Text } from '@mantine/core';
import { useMemo } from 'react';
import { useStore } from '@/core/zustand';
import { useFactoryContext } from '@/FactoryContext';
import {
  AllFactoryRecipesMap,
  getAllRecipesForIngredient,
} from '@/recipes/FactoryRecipe';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { RecipeTooltip } from '@/recipes/ui/RecipeTooltip';
import { useSolverAllowedRecipes } from '@/solver/store/solverSelectors';

export interface IByproductProcessFurtherActionProps {
  resourceId: string;
  onPicked?: () => void;
}

export function ByproductProcessFurtherAction(
  props: IByproductProcessFurtherActionProps,
) {
  const { resourceId, onPicked } = props;
  const solverId = useFactoryContext();
  const allowedRecipes = useSolverAllowedRecipes(solverId);

  const recipes = useMemo(
    () => getAllRecipesForIngredient(resourceId),
    [resourceId],
  );

  const handlePick = (recipeId: string) => {
    const recipe = AllFactoryRecipesMap[recipeId];
    if (!recipe) return;

    const newResource = recipe.products[0]?.resource;
    if (!newResource) return;

    const factory = useStore.getState().factories.factories[solverId];
    const alreadyExists = factory?.outputs?.some(
      o => o.resource === newResource && o.objective === 'max',
    );

    if (!allowedRecipes?.includes(recipeId)) {
      useStore.getState().toggleRecipe(solverId, { recipeId, use: true });
    }

    if (!alreadyExists) {
      useStore.getState().addFactoryOutput(solverId, {
        resource: newResource,
        amount: 0,
        objective: 'max',
      });
    }

    onPicked?.();
  };

  if (recipes.length === 0) {
    return (
      <Stack gap={4} w="100%">
        <Text size="xs" fw={500}>
          Process further
        </Text>
        <Text size="xs" c="dimmed" fs="italic">
          No recipes consume this item.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap={4} w="100%" data-tutorial-id="byproduct-action-process-further">
      <Text size="xs" fw={500}>
        Process further
      </Text>
      <Text size="xs" c="dimmed">
        Pick a recipe to consume this item.
      </Text>
      <ScrollArea.Autosize mah={120}>
        <Stack gap={4}>
          {recipes.map(r => {
            const productId = r.products[0]?.resource;
            const isAlternate = r.name.startsWith('Alternate: ');
            const displayName = isAlternate
              ? r.name.slice('Alternate: '.length)
              : r.name;
            return (
              <RecipeTooltip key={r.id} recipeId={r.id}>
                <Button
                  fullWidth
                  variant="default"
                  size="xs"
                  justify="flex-start"
                  onClick={() => handlePick(r.id)}
                  leftSection={
                    productId ? (
                      <FactoryItemImage id={productId} size={16} />
                    ) : null
                  }
                >
                  <Group gap={4} wrap="nowrap">
                    {isAlternate && (
                      <Text size="9" c="dimmed" span>
                        ALT
                      </Text>
                    )}
                    <Text size="xs" span>
                      {displayName}
                    </Text>
                  </Group>
                </Button>
              </RecipeTooltip>
            );
          })}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}
