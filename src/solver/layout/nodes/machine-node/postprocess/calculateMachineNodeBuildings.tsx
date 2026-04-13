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
  const somersloopsPerMachine =
    building.somersloopSlots > 0
      ? Math.min(somersloops, building.somersloopSlots)
      : 0;
  const amplifiedRate =
    building.somersloopSlots > 0 && somersloopsPerMachine > 0
      ? 1 + somersloopsPerMachine / building.somersloopSlots
      : 1;
  const buildingsAmount = value / perBuilding / overclock / amplifiedRate;

  const fullBuildingsAmount = Math.floor(buildingsAmount);
  const reminder = buildingsAmount - fullBuildingsAmount - Number.EPSILON;
  const partialBuildingAmount = reminder > 0.0001 ? Math.ceil(reminder) : 0;
  const partialBuildingOverclock = reminder * overclock;

  const roundedBuildingsAmount = fullBuildingsAmount + partialBuildingAmount;
  const boostedBuildings = Math.min(
    somersloops > 0
      ? Math.ceil(somersloops / building.somersloopSlots)
      : 0,
    roundedBuildingsAmount,
  );
  const normalBuildings = roundedBuildingsAmount - boostedBuildings;
  const normalPower =
    normalBuildings *
    building.powerConsumption *
    Math.pow(overclock, building.powerConsumptionExponent);
  const boostedPower =
    boostedBuildings *
    building.powerConsumption *
    Math.pow(overclock, building.somersloopPowerConsumptionExponent);
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
