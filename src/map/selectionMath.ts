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
 * Standalone fluid pump per resource id, used only for non-fracking
 * (`BP_ResourceNode_C`) nodes. Fracking satellites always use the
 * Resource Well Extractor regardless of resource.
 */
const STANDALONE_FLUID_EXTRACTOR: Record<string, string> = {
  Desc_LiquidOil_C: 'Build_OilPump_C',
  Desc_Water_C: 'Build_WaterPump_C',
};

const RESOURCE_WELL_EXTRACTOR_ID = 'Build_FrackingExtractor_C';

function findBuilding(id: string): FactoryBuilding | undefined {
  return AllFactoryBuildings.find(b => b.id === id);
}

/**
 * Picks the extractor building used when summing a node's yield in
 * the aggregate panel. The decision is gated by the node's actor type
 * so a fracking satellite of crude oil is summed using the Resource
 * Well Extractor's rate, *not* the Oil Pump's, even though both
 * produce the same resource.
 *
 * Returns `undefined` when the node has no factory-buildable extractor
 * (cores, geysers, deposits) so the sum panel skips it cleanly.
 */
function getExtractorForNode(
  node: WorldResourceNode,
  selectedMinerId: string,
): FactoryBuilding | undefined {
  switch (node.nodeType) {
    case 'frackingSatellite':
      return findBuilding(RESOURCE_WELL_EXTRACTOR_ID);
    case 'frackingCore':
    case 'geyser':
    case 'deposit':
      return undefined;
    case 'node': {
      const item = AllFactoryItemsMap[node.resource];
      if (!item) return undefined;
      if (item.form === FactoryItemForm.Solid) {
        return findBuilding(selectedMinerId);
      }
      const pumpId = STANDALONE_FLUID_EXTRACTOR[node.resource];
      return pumpId ? findBuilding(pumpId) : undefined;
    }
    default:
      return undefined;
  }
}

export interface ResourceAggregate {
  /**
   * Stable React key. Combines resource and extractor so a selection
   * containing both an oil node *and* an oil fracking satellite shows
   * up as two honest rows (Oil Pump vs Resource Well Extractor) rather
   * than one mis-summed row.
   */
  key: string;
  resource: string;
  /** Display name for the resource, for convenience in the UI. */
  displayName: string;
  /** Extractor picked for this row (differs per solid vs fluid vs well). */
  extractorName: string;
  unit: string;
  /** Sum of yields across every selected node of this resource. */
  totalRate: number;
  /** Count of nodes contributing, broken down by purity. */
  purityCounts: Record<Purity, number>;
  /** Total node count for this row (sum of {@link purityCounts}). */
  nodeCount: number;
}

/**
 * Computes per-resource totals for the given set of nodes at the
 * chosen miner tier and overclock. Fluids/gases ignore `minerId` and
 * use a default extractor. Resources with no known extractor (cores,
 * geysers, deposits) are skipped. Rows are split per `(resource,
 * extractor)` pair so a selection that mixes standalone oil nodes with
 * oil fracking satellites yields two honest sub-totals.
 */
export function getSelectionAggregates(
  nodes: readonly WorldResourceNode[],
  minerId: string,
  overclock: OverclockStep,
): ResourceAggregate[] {
  const byKey = new Map<string, ResourceAggregate>();
  for (const node of nodes) {
    const extractor = getExtractorForNode(node, minerId);
    if (!extractor) continue;

    const key = `${node.resource}::${extractor.id}`;
    let aggregate = byKey.get(key);
    if (!aggregate) {
      const item = AllFactoryItemsMap[node.resource];
      aggregate = {
        key,
        resource: node.resource,
        displayName: item?.displayName ?? node.resource,
        extractorName: extractor.name,
        unit: getExtractionUnit(node.resource),
        totalRate: 0,
        purityCounts: { impure: 0, normal: 0, pure: 0 },
        nodeCount: 0,
      };
      byKey.set(key, aggregate);
    }

    aggregate.totalRate += getExtractionRate(extractor, node.purity, overclock);
    aggregate.purityCounts[node.purity] += 1;
    aggregate.nodeCount += 1;
  }

  // Stable display order: alphabetical by display name first, then
  // extractor name to keep matching resources adjacent.
  return [...byKey.values()].sort((a, b) => {
    const byName = a.displayName.localeCompare(b.displayName);
    return byName !== 0
      ? byName
      : a.extractorName.localeCompare(b.extractorName);
  });
}
