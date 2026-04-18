import {
  AllFactoryBuildings,
  type FactoryBuilding,
} from '@/recipes/FactoryBuilding';
import { AllFactoryItemsMap, FactoryItemForm } from '@/recipes/FactoryItem';
import type {
  Purity,
  WorldResourceNode,
  WorldResourceNodeType,
} from '@/recipes/WorldResourceNodes';

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

const RESOURCE_WELL_EXTRACTOR_ID = 'Build_FrackingExtractor_C';

/**
 * Standalone (non-fracking) fluid pumps per resource id. These apply
 * to `BP_ResourceNode_C` actors only — fracking satellites use the
 * resource well extractor regardless of resource.
 */
const STANDALONE_FLUID_EXTRACTOR_IDS: Record<string, string> = {
  Desc_LiquidOil_C: 'Build_OilPump_C',
  Desc_Water_C: 'Build_WaterPump_C',
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
 * Returns the list of extractors that can pull this specific node out
 * of the ground, in display order. The choice depends on the node's
 * **actor type**, not just its resource — a fracking satellite of oil
 * is extracted only by the Resource Well Extractor, *not* an Oil Pump,
 * even though both produce crude oil.
 *
 * - `node` (standalone): Mk1/Mk2/Mk3 miners for solids, or the
 *   appropriate fluid pump for liquids (e.g. Oil Pump for crude oil).
 * - `frackingSatellite`: Resource Well Extractor only.
 * - `frackingCore`: empty — the core itself isn't extracted; players
 *   place a Resource Well Pressurizer on it to activate the
 *   surrounding satellites.
 * - `geyser`: empty — geysers feed the Geothermal Generator (power
 *   only, not a resource extractor).
 * - `deposit`: empty — breakable rocks are harvested with the portable
 *   miner, which isn't a placeable factory building.
 */
export function getExtractorsForNode(
  node: Pick<WorldResourceNode, 'resource' | 'nodeType'>,
): FactoryBuilding[] {
  switch (node.nodeType) {
    case 'frackingSatellite':
      return findBuildings([RESOURCE_WELL_EXTRACTOR_ID]);
    case 'frackingCore':
    case 'geyser':
    case 'deposit':
      return [];
    case 'node': {
      const item = AllFactoryItemsMap[node.resource];
      if (!item) return [];
      if (item.form === FactoryItemForm.Solid) {
        return findBuildings(SOLID_MINER_IDS);
      }
      const pumpId = STANDALONE_FLUID_EXTRACTOR_IDS[node.resource];
      return pumpId ? findBuildings([pumpId]) : [];
    }
    default:
      return [];
  }
}

/**
 * Short human-friendly summary of how this node is harvested in-game.
 * Surfaced in the popover as a hint above (or instead of) the rates
 * table, so players who don't know the well/geyser mechanics can still
 * make sense of the markers.
 */
export function getExtractionMethodLabel(
  nodeType: WorldResourceNodeType,
): string | undefined {
  switch (nodeType) {
    case 'frackingSatellite':
    case 'frackingCore':
      return undefined;
    case 'geyser':
      return 'Powers the Geothermal Generator (no resource extraction).';
    case 'deposit':
      return 'Mine with the Portable Miner.';
    default:
      return undefined;
  }
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
