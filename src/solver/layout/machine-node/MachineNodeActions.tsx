import { useStore } from '@/core/zustand';
import { FactoryInputIcon } from '@/factories/components/peek/icons/OutputInputIcons';
import { ActionIcon, Button, Group, Stack, Tooltip } from '@mantine/core';
import { useInputState } from '@mantine/hooks';
import { IconCircleCheckFilled, IconTrash } from '@tabler/icons-react';
import { useParams } from 'react-router-dom';
import type { IMachineNodeData } from '../MachineNode';
import { MachineNodeProductionConfig } from './MachineNodeProductionConfig';
import {
  SwitchRecipeAction,
  useRecipeAlternatesInputState,
} from './SwitchRecipeAction';

export interface IMachineNodeActionsProps {
  id: string;
  data: IMachineNodeData;

  buildingsAmount: number;
}

/**
 * Contains all changes which can be applied to a machine node.
 * These are the ones requiring the "apply" button.
 */
export function MachineNodeActions(props: IMachineNodeActionsProps) {
  const { data, buildingsAmount } = props;
  const { recipe, value } = data;

  const solverId = useParams<{ id: string }>().id;

  const nodeState = useStore(
    state => state.solvers.instances[solverId ?? '']?.nodes?.[props.id],
  );

  // 1. Edit alternate recipes
  const {
    recipes,
    allowedRecipes,
    setAllowedRecipes,
    changed: recipesChanged,
  } = useRecipeAlternatesInputState(data.recipe.id);

  // 2. Somersloops and overclock
  const [somersloopsValue, setSomersloopsValue] = useInputState(
    nodeState?.somersloops as number | string,
  );
  const [overclockValue, setOverclockValue] = useInputState(
    nodeState?.overclock as number | string,
  );

  const isApplyDisabled =
    !recipesChanged &&
    somersloopsValue === nodeState?.somersloops &&
    overclockValue === nodeState?.overclock;

  const handleApply = () => {
    // 1. Update the allowed recipes
    if (recipesChanged) {
      useStore
        .getState()
        .setAllowedRecipes(solverId!, all =>
          all
            ?.filter(id => !recipes.some(r => r.id === id))
            .concat(allowedRecipes),
        );
    }

    // 2. Update the somersloops and overclock
    if (
      somersloopsValue !== nodeState?.somersloops ||
      overclockValue !== nodeState?.overclock
    )
      useStore.getState().updateSolverNode(solverId!, props.id, node => {
        node.somersloops = somersloopsValue
          ? Number(somersloopsValue)
          : undefined;
        // node.amplification = node.somersloops
        //   ? node.somersloops / maxSlots
        //   : undefined;
        node.overclock = overclockValue ? Number(overclockValue) : undefined;
      });
  };

  return (
    <Stack gap="sm" align="flex-start">
      <Group justify="space-between">
        <Group gap="sm">
          <Tooltip label="Ignore this recipe">
            <ActionIcon
              color="red"
              variant="outline"
              onClick={() =>
                useStore.getState().toggleRecipe(solverId!, {
                  recipeId: recipe.id,
                  use: false,
                })
              }
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>

          <Tooltip
            label={nodeState?.done ? 'Remove built marker' : 'Mark as built'}
          >
            <ActionIcon
              color="green"
              variant={nodeState?.done ? 'filled' : 'outline'}
              onClick={() =>
                useStore
                  .getState()
                  .updateSolverNode(solverId!, props.id, node => {
                    node.done = !node.done;
                  })
              }
            >
              <IconCircleCheckFilled size={16} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Remove recipe and replace it with an Input of the same amount.">
            <ActionIcon
              color="blue"
              variant="outline"
              onClick={() =>
                useStore.getState().addFactoryInput(solverId!, {
                  resource: recipe.products[0].resource,
                  amount: value,
                })
              }
            >
              <FactoryInputIcon size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Button
          variant={isApplyDisabled ? 'default' : 'filled'}
          color="blue"
          size="xs"
          disabled={isApplyDisabled}
          onClick={handleApply}
        >
          Apply
        </Button>
      </Group>

      <MachineNodeProductionConfig
        id={props.id}
        buildingsAmount={buildingsAmount}
        machine={props.data}
        overclockValue={overclockValue}
        setOverclockValue={setOverclockValue}
        somersloopsValue={somersloopsValue}
        setSomersloopsValue={setSomersloopsValue}
      />

      <SwitchRecipeAction
        recipeId={recipe.id}
        recipes={recipes}
        allowedRecipes={allowedRecipes}
        setAllowedRecipes={setAllowedRecipes}
      />
    </Stack>
  );
}
