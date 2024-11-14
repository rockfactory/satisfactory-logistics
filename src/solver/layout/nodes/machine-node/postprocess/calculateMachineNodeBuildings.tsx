import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { getRecipeProductPerBuilding } from '@/recipes/FactoryRecipe';
import type { SolverNodeState } from '@/solver/store/Solver';
import type { IMachineNodeData } from '@/solver/layout/nodes/machine-node/MachineNode';

export function calculateMachineNodeBuildings(
  data: IMachineNodeData,
  nodeState: SolverNodeState | null | undefined,
) {
  const { recipe, value, originalValue, amplifiedValue } = data;

  const product = AllFactoryItemsMap[recipe.products[0].resource];
  const building = AllFactoryBuildingsMap[recipe.producedIn];

  const perBuilding = getRecipeProductPerBuilding(recipe, product.id);

  const somersloops = nodeState?.somersloops ?? 0;

  // State-based values
  const overclock = nodeState?.overclock ?? 1;
  const buildingsAmount = originalValue / perBuilding / overclock;
  const amplifiedRate = (amplifiedValue + originalValue) / originalValue;

  const fullBuildingsAmount = Math.floor(buildingsAmount);
  const reminder = buildingsAmount - fullBuildingsAmount - Number.EPSILON;
  const partialBuildingAmount = reminder > 0.0001 ? Math.ceil(reminder) : 0;
  const partialBuildingOverclock = reminder * overclock;

  return {
    overclock,
    somersloops,
    buildingsAmount,
    amplifiedRate,
    perBuilding,
    building,
    product,
    data,
    roundedBuildingsAmount: fullBuildingsAmount + partialBuildingAmount,
    fullBuildingsAmount,
    partialBuildingAmount,
    partialBuildingOverclock,
  };
}
