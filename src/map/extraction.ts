import {
  AllFactoryBuildings,
  type FactoryBuilding,
} from '@/recipes/FactoryBuilding';
import { AllFactoryItemsMap, FactoryItemForm } from '@/recipes/FactoryItem';
import type { Purity } from '@/recipes/WorldResourceNodes';

/**
 * Purity multiplier applied to an extractor's base `itemsPerMinute`.
 * Matches the in-game scaling: Impure = 0.5x, Normal = 1x, Pure = 2x.
 */
export const PURITY_MULTIPLIER: Record<Purity, number> = {
  impure: 0.5,
  normal: 1,
  pure: 2,
};

/**
 * Overclock percentages we surface in the per-node yield table. Mirrors
 * the satisfactory-calculator.com node popover (50% / 100% / 150% /
 * 200% / 250%).
 */
export const OVERCLOCK_STEPS = [50, 100, 150, 200, 250] as const;
export type OverclockStep = (typeof OVERCLOCK_STEPS)[number];

const SOLID_MINER_IDS = [
  'Build_MinerMk1_C',
  'Build_MinerMk2_C',
  'Build_MinerMk3_C',
] as const;

const FLUID_EXTRACTOR_IDS: Record<string, string[]> = {
  Desc_LiquidOil_C: ['Build_OilPump_C', 'Build_FrackingExtractor_C'],
  Desc_Water_C: ['Build_WaterPump_C', 'Build_FrackingExtractor_C'],
  Desc_NitrogenGas_C: ['Build_FrackingExtractor_C'],
};

function findBuildings(ids: readonly string[]): FactoryBuilding[] {
  const buildings: FactoryBuilding[] = [];
  for (const id of ids) {
    const building = AllFactoryBuildings.find(b => b.id === id);
    if (building) buildings.push(building);
  }
  return buildings;
}

/**
 * Returns the list of extractors that can pull `resource` out of the
 * ground, in display order. Solids return Mk1/Mk2/Mk3 miners. Fluids
 * and gases return the appropriate extractor + the resource well
 * extractor when applicable. Order is preserved.
 */
export function getExtractorsForResource(resource: string): FactoryBuilding[] {
  const item = AllFactoryItemsMap[resource];
  if (!item) return [];
  if (item.form === FactoryItemForm.Solid) {
    return findBuildings(SOLID_MINER_IDS);
  }
  return findBuildings(FLUID_EXTRACTOR_IDS[resource] ?? []);
}

/**
 * Computes the rounded items-per-minute (or m³/min) for the given
 * extractor on a node of `purity`, at the given overclock percentage.
 */
export function getExtractionRate(
  building: FactoryBuilding,
  purity: Purity,
  overclock: OverclockStep,
): number {
  const base = building.extractor?.itemsPerMinute ?? 0;
  const rate = base * PURITY_MULTIPLIER[purity] * (overclock / 100);
  return Math.round(rate);
}

/**
 * Unit string used in the yield table — `m³/min` for liquids and
 * gases, `/min` for solid items (matches the project's existing
 * convention in the building codex).
 */
export function getExtractionUnit(resource: string): string {
  const item = AllFactoryItemsMap[resource];
  if (
    item?.form === FactoryItemForm.Liquid ||
    item?.form === FactoryItemForm.Gas
  ) {
    return 'm³/min';
  }
  return '/min';
}
