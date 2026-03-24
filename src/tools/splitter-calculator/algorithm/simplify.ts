import { FactoryConveyorBelts } from '@/recipes/FactoryBuilding';
import type {
  BeltTier,
  ConveyorLink,
  ConveyorNode,
  SplitterResult,
  SplitterTarget,
} from './types';

function getBeltTiers(maxBeltSpeed: number): BeltTier[] {
  return FactoryConveyorBelts.filter(b => b.conveyor!.speed <= maxBeltSpeed)
    .map(b => ({ name: b.name, speed: b.conveyor!.speed }))
    .sort((a, b) => a.speed - b.speed);
}

/**
 * Belt speed simplification: when a splitter evenly divides flow and the
 * result matches a belt speed, we can use a lower-tier belt instead of
 * splitting. This collapses chains of splitters that produce standard
 * belt-speed outputs.
 *
 * For example: 240/min split into 2x 120/min — each 120/min is exactly
 * a Mk.2 belt, so the splitter output is labeled "Mk.2 Belt" and no
 * further splitting tree is needed downstream.
 */
export function simplifyWithBeltSpeeds(
  result: SplitterResult,
  maxBeltSpeed: number,
): SplitterResult {
  const tiers = getBeltTiers(maxBeltSpeed);
  if (tiers.length === 0) return result;

  const beltSpeeds = new Set(tiers.map(t => t.speed));

  // Find splitter nodes whose outputs all match a belt speed
  for (const node of result.nodes) {
    if (node.type !== 'splitter') continue;
    if (node.children.length < 2) continue;

    // Check if all output rates match a belt speed
    const allMatchBelt = node.children.every(l =>
      beltSpeeds.has(Math.round(l.carrying)),
    );

    if (allMatchBelt) {
      // Label each output link with the belt tier
      for (const childLink of node.children) {
        const tier = tiers.find(
          t => Math.abs(t.speed - childLink.carrying) < 0.01,
        );
        if (tier) {
          childLink.to.label = `${tier.name} (${tier.speed}/min)`;
        }
      }
    }
  }

  return result;
}

/**
 * Smart splitter simplification: when targets have item filters or
 * overflow markers, replace chains of regular splitters with a single
 * smart splitter node that handles the routing.
 *
 * A smart splitter in Satisfactory has 3 outputs, each configurable to:
 * - Filter a specific item type
 * - Accept "any" remaining items
 * - Act as overflow (only receives items when other outputs are backed up)
 *
 * We simplify by:
 * 1. If targets use item filters, replace the merge point with a smart splitter
 * 2. If a target is marked as overflow, it becomes the overflow output
 * 3. Up to 3 outputs per smart splitter (game limit)
 */
export function simplifyWithSmartSplitters(
  result: SplitterResult,
  targets: SplitterTarget[],
): SplitterResult {
  const hasSmartOutputs = targets.some(t => t.itemFilter || t.isOverflow);
  if (!hasSmartOutputs) return result;

  // Group targets that could share a smart splitter (up to 3 outputs each)
  // For now, if we have <= 3 targets with filters, use one smart splitter
  const filteredTargets = targets.filter(t => t.itemFilter || t.isOverflow);
  if (filteredTargets.length === 0) return result;

  // Find the deepest common splitter ancestor that feeds all target nodes
  const targetNodes = result.nodes.filter(n => n.type === 'target');
  if (targetNodes.length <= 3 && filteredTargets.length > 0) {
    // We can potentially replace the entire split tree with a smart splitter
    // Find the source node(s)
    const sourceNodes = result.nodes.filter(n => n.type === 'source');
    if (sourceNodes.length === 1) {
      const source = sourceNodes[0];

      // Check if we can replace the intermediate network with a smart splitter
      if (targetNodes.length <= 3) {
        // Create a smart splitter that directly connects source to targets
        const smartSplitter: ConveyorNode = {
          id: `smart-${source.id}`,
          type: 'smart_splitter',
          holding: source.holding,
          children: [],
          parents: [],
          label: 'Smart Splitter',
        };

        // Clear old graph
        const newLinks: ConveyorLink[] = [];

        // Source -> Smart Splitter
        const sourceLink: ConveyorLink = {
          from: source,
          to: smartSplitter,
          carrying: source.holding,
        };
        source.children = [sourceLink];
        smartSplitter.parents = [sourceLink];
        newLinks.push(sourceLink);

        // Smart Splitter -> each target
        for (let i = 0; i < targetNodes.length; i++) {
          const target = targetNodes[i];
          const tgt = targets[i];
          const targetLink: ConveyorLink = {
            from: smartSplitter,
            to: target,
            carrying: target.holding,
          };

          target.parents = [targetLink];
          smartSplitter.children.push(targetLink);
          newLinks.push(targetLink);

          if (tgt?.itemFilter) {
            target.smartRule = 'item_filter';
            target.label = `${tgt.itemFilter}: ${target.holding}/min`;
          } else if (tgt?.isOverflow) {
            target.smartRule = 'overflow';
            target.label = `Overflow: ${target.holding}/min`;
          }
        }

        return {
          nodes: [source, smartSplitter, ...targetNodes],
          links: newLinks,
        };
      }
    }
  }

  return result;
}

/**
 * Apply all simplification passes in order.
 */
export function applySimplfications(
  result: SplitterResult,
  maxBeltSpeed: number,
  targets: SplitterTarget[],
  allowSmartSplitters: boolean,
): SplitterResult {
  let simplified = simplifyWithBeltSpeeds(result, maxBeltSpeed);
  if (allowSmartSplitters) {
    simplified = simplifyWithSmartSplitters(simplified, targets);
  }
  return simplified;
}
