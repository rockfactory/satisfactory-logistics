import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { getRecipeProductPerBuilding } from '@/recipes/FactoryRecipe';
import type { SolverNodeState } from '@/solver/store/Solver';
import type { IMachineNodeData } from '../MachineNode';

export function calculateMachineNodeBuildings(
  data: IMachineNodeData,
  nodeState: SolverNodeState | null | undefined,
) {
  const { recipe, value, originalValue, amplifiedValue } = data;

  const product = AllFactoryItemsMap[recipe.products[0].resource];
  const building = AllFactoryBuildingsMap[recipe.producedIn];

  const perBuilding = getRecipeProductPerBuilding(recipe, product.id);

  // State-based values
  const overclock = nodeState?.overclock ?? 1;
  const buildingsAmount = originalValue / perBuilding / overclock;
  const amplifiedRate = (amplifiedValue + originalValue) / originalValue;
}
