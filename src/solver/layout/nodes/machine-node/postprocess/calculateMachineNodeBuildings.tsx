import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { getRecipeProductPerBuilding } from '@/recipes/FactoryRecipe';
import type { IMachineNodeData } from '@/solver/layout/nodes/machine-node/MachineNode';
import type { SolverNodeState } from '@/solver/store/Solver';

export function calculateMachineNodeBuildings(
  data: IMachineNodeData,
  nodeState: SolverNodeState | null | undefined,
) {
  const { recipe, value, originalValue, amplifiedValue } = data;

  const product = AllFactoryItemsMap[recipe.products[0].resource];
  const building = AllFactoryBuildingsMap[recipe.producedIn];

  const perBuilding = getRecipeProductPerBuilding(recipe, product.id);

  // somersloops is per-machine (0..slots). Clamp for backward compat
  // with old saves where the value was a total.
  const somersloops = nodeState?.somersloops
    ? Math.min(nodeState.somersloops, building.somersloopSlots)
    : 0;

  // State-based values
  const overclock = nodeState?.overclock ?? 1;

  // Compute amplifiedRate using the same formula as the LP solver:
  // sloopRatio = min(somersloops / slots, 1)
  const sloopRatio =
    building.somersloopSlots > 0 && somersloops > 0
      ? Math.min(somersloops / building.somersloopSlots, 1)
      : 0;
  const amplifiedRate = 1 + sloopRatio;
  const buildingsAmount = value / perBuilding / overclock / amplifiedRate;

  const fullBuildingsAmount = Math.floor(buildingsAmount);
  const remainder = buildingsAmount - fullBuildingsAmount;
  const partialBuildingAmount = remainder > 0.0001 ? Math.ceil(remainder) : 0;
  const partialBuildingOverclock = remainder * overclock;

  const roundedBuildingsAmount = fullBuildingsAmount + partialBuildingAmount;

  // somersloops is already per-machine
  const somersloopsPerMachine = somersloops;
  // All buildings are boosted when somersloops > 0 (uniform distribution)
  const boostedBuildings = somersloops > 0 ? roundedBuildingsAmount : 0;
  const normalBuildings = roundedBuildingsAmount - boostedBuildings;
  const normalPower =
    normalBuildings *
    building.powerConsumption *
    overclock ** building.powerConsumptionExponent;
  const boostedPower =
    boostedBuildings *
    building.powerConsumption *
    overclock ** building.somersloopPowerConsumptionExponent;
  const totalPower = normalPower + boostedPower;

  return {
    overclock,
    somersloops,
    somersloopsPerMachine,
    buildingsAmount,
    amplifiedRate,
    perBuilding,
    building,
    product,
    data,
    roundedBuildingsAmount,
    fullBuildingsAmount,
    partialBuildingAmount,
    partialBuildingOverclock,
    totalPower,
    boostedBuildings,
  };
}
