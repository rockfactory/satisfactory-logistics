import { useStore } from '@/core/zustand';
import { FactoryInputIcon } from '@/factories/components/peek/icons/OutputInputIcons';
import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import { useSolverSolution } from '@/solver/layout/solution-context/SolverSolutionContext';
import { ActionIcon, Button, Group, Stack, Tooltip } from '@mantine/core';
import { useInputState } from '@mantine/hooks';
import { IconCircleCheckFilled, IconTrash } from '@tabler/icons-react';
import type { IMachineNodeData } from './MachineNode';
import { MachineNodeProductionConfig } from './MachineNodeProductionConfig';
import {
  SwitchRecipeAction,
  useRecipeAlternatesInputState,
} from './SwitchRecipeAction';
import { showConfettiWhenFactoryBuilt } from './showConfettiWhenFactoryBuilt';
import { useFactoryContext } from '@/FactoryContext';

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

  const solverId = useFactoryContext();
  const { solution } = useSolverSolution();

  const nodeState = useStore(
    state => state.solvers.instances[solverId ?? '']?.nodes?.[props.id],
  );

  const building = AllFactoryBuildingsMap[recipe.producedIn];
  const slotsPerBuilding = building.somersloopSlots;
  const roundedBuildings = Math.ceil(buildingsAmount - 0.0001);

  // 1. Edit alternate recipes
  const {
    recipes,
    allowedRecipes,
    setAllowedRecipes,
    changed: recipesChanged,
  } = useRecipeAlternatesInputState(data.recipe.id);

  // 2. Somersloops (stored per-machine, displayed per-machine) and overclock
  // Clamp stored value to slotsPerBuilding for backward compat with old saves
  // where the stored value was a total (0..buildings*slots).
  const storedPerMachine = nodeState?.somersloops
    ? Math.min(nodeState.somersloops, slotsPerBuilding)
    : undefined;
  const [somersloopsValue, setSomersloopsValue] = useInputState(
    (storedPerMachine ?? '') as number | string,
  );
  const [overclockValue, setOverclockValue] = useInputState(
    nodeState?.overclock as number | string,
  );

  const perMachineSomersloops = Number(somersloopsValue) || 0;
  const totalSomersloops = perMachineSomersloops * roundedBuildings;

  const isApplyDisabled =
    !recipesChanged &&
    perMachineSomersloops === (storedPerMachine ?? 0) &&
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

    // 2. Update somersloops
    // nodeState.somersloops = per-machine (0..slots) — used by LP solver
    // nodeState.somersloopsTotal = total across buildings — used for factory output display
    if (perMachineSomersloops !== (storedPerMachine ?? 0)) {
      useStore
        .getState()
        .updateSolverSomersloops(
          solution.graph,
          solverId!,
          props.id,
          perMachineSomersloops,
          totalSomersloops,
        );
    }

    // 3. Update overclock
    if (overclockValue !== nodeState?.overclock)
      useStore.getState().updateSolverNode(solverId!, props.id, node => {
        node.somersloops = perMachineSomersloops || undefined;
        node.somersloopsTotal = totalSomersloops || undefined;
        node.overclock = overclockValue ? Number(overclockValue) : undefined;
      });
  };

  return (
    <Stack gap="sm" align="flex-start">
      <Group justify="space-between" w="100%">
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
            label={
              nodeState?.done ? (
                <span>Remove built marker</span>
              ) : (
                <span>Mark as built</span>
              )
            }
          >
            <ActionIcon
              color="green"
              variant={nodeState?.done ? 'filled' : 'outline'}
              onClick={() => {
                useStore
                  .getState()
                  .updateSolverNode(solverId!, props.id, node => {
                    node.done = !node.done;
                  });

                // Ta-da!
                showConfettiWhenFactoryBuilt(solution, solverId!);
              }}
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
