import {
  AllFactoryBuildings,
  type FactoryBuilding,
} from '@/recipes/FactoryBuilding';
import { AllFactoryItemsMap, FactoryItemForm } from '@/recipes/FactoryItem';
import type { Purity, WorldResourceNode } from '@/recipes/WorldResourceNodes';
import {
  getExtractionRate,
  getExtractionUnit,
  type OverclockStep,
} from './extraction';

/**
 * Solid-ore miners, ordered from worst to best. The aggregate panel
 * lets the player pick one and applies it to every solid resource in
 * the selection.
 */
export const SOLID_MINER_CHOICES = [
  'Build_MinerMk1_C',
  'Build_MinerMk2_C',
  'Build_MinerMk3_C',
] as const;

/**
 * Default fluid/gas extractor per resource id. Matches the in-game
 * practical choice — Oil Pump for crude oil, Water Pump for water,
 * Fracking Extractor for nitrogen (which has no simpler alternative).
 */
const DEFAULT_FLUID_EXTRACTOR: Record<string, string> = {
  Desc_LiquidOil_C: 'Build_OilPump_C',
  Desc_Water_C: 'Build_WaterPump_C',
  Desc_NitrogenGas_C: 'Build_FrackingExtractor_C',
};

function findBuilding(id: string): FactoryBuilding | undefined {
  return AllFactoryBuildings.find(b => b.id === id);
}

/**
 * Picks the extractor building used when summing a node's yield in
 * the aggregate panel. Solids use whatever miner the user selected in
 * the panel; fluids/gases use their hard-coded default extractor.
 * Returns `undefined` when the resource has no known extractor.
 */
function getExtractorForNode(
  resource: string,
  selectedMinerId: string,
): FactoryBuilding | undefined {
  const item = AllFactoryItemsMap[resource];
  if (!item) return undefined;
  if (item.form === FactoryItemForm.Solid) return findBuilding(selectedMinerId);
  const fluidExtractorId = DEFAULT_FLUID_EXTRACTOR[resource];
  return fluidExtractorId ? findBuilding(fluidExtractorId) : undefined;
}

export interface ResourceAggregate {
  resource: string;
  /** Display name for the resource, for convenience in the UI. */
  displayName: string;
  /** Extractor picked for this resource (differs per solid vs fluid). */
  extractorName: string;
  unit: string;
  /** Sum of yields across every selected node of this resource. */
  totalRate: number;
  /** Count of nodes contributing, broken down by purity. */
  purityCounts: Record<Purity, number>;
  /** Total node count for this resource (sum of {@link purityCounts}). */
  nodeCount: number;
}

/**
 * Computes per-resource totals for the given set of nodes at the
 * chosen miner tier and overclock. Fluids/gases ignore `minerId` and
 * use a default extractor. Resources with no known extractor are
 * skipped.
 */
export function getSelectionAggregates(
  nodes: readonly WorldResourceNode[],
  minerId: string,
  overclock: OverclockStep,
): ResourceAggregate[] {
  const byResource = new Map<string, ResourceAggregate>();
  for (const node of nodes) {
    const extractor = getExtractorForNode(node.resource, minerId);
    if (!extractor) continue;

    let aggregate = byResource.get(node.resource);
    if (!aggregate) {
      const item = AllFactoryItemsMap[node.resource];
      aggregate = {
        resource: node.resource,
        displayName: item?.displayName ?? node.resource,
        extractorName: extractor.name,
        unit: getExtractionUnit(node.resource),
        totalRate: 0,
        purityCounts: { impure: 0, normal: 0, pure: 0 },
        nodeCount: 0,
      };
      byResource.set(node.resource, aggregate);
    }

    aggregate.totalRate += getExtractionRate(extractor, node.purity, overclock);
    aggregate.purityCounts[node.purity] += 1;
    aggregate.nodeCount += 1;
  }

  // Stable display order: alphabetical by display name, which is
  // easier to scan than resource id order.
  return [...byResource.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
}
