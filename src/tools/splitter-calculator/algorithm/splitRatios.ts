import { FactoryConveyorBelts } from '@/recipes/FactoryBuilding';
import { nextSmooth, toIntegerRatios } from './fraction';
import type {
  BeltTier,
  ConveyorLink,
  ConveyorNode,
  SplitterRequest,
  SplitterResult,
} from './types';

const MAX_MERGE = 3;

let nodeIdCounter = 0;

function createNode(
  type: ConveyorNode['type'],
  holding: number,
  label?: string,
): ConveyorNode {
  return {
    id: `node-${nodeIdCounter++}`,
    type,
    holding,
    children: [],
    parents: [],
    label,
  };
}

function link(from: ConveyorNode, to: ConveyorNode, carrying: number) {
  const l: ConveyorLink = { from, to, carrying };
  from.children.push(l);
  to.parents.push(l);
  return l;
}

/**
 * Recursively build a splitter tree that produces `count` equal output
 * streams from an input of `inputRate`.
 *
 * Splitters divide evenly: 2 outputs = 50/50, 3 outputs = thirds.
 * For counts that aren't products of 2s and 3s, we round up to the
 * next 2/3-smooth number, split into that many streams, and loop
 * back the excess — but only when the loopback total fits within
 * belt capacity. When it doesn't, we pre-split into smaller groups
 * and handle each independently.
 */
function splitIntoStreams(
  source: ConveyorNode,
  count: number,
  ratePerStream: number,
  maxBeltSpeed: number,
): ConveyorNode[] {
  if (count <= 1) return [source];

  const smooth = nextSmooth(count);
  const loopBack = smooth - count;
  const sourceRate = source.holding;
  const treeInputRate = smooth * ratePerStream;

  if (loopBack === 0 && treeInputRate <= maxBeltSpeed + 0.01) {
    return buildSplitTree(source, sourceRate, count, ratePerStream);
  }

  // If loopback would push the tree input beyond belt capacity, or
  // the total rate simply can't fit on one belt, pre-split into
  // sub-groups that each stay within limits.
  if (treeInputRate > maxBeltSpeed + 0.01) {
    return preSplitIntoGroups(source, sourceRate, count, ratePerStream, maxBeltSpeed);
  }

  // Loopback fits within belt capacity. The steady-state rate on the
  // source belt is throttled by back-pressure to: sourceRate - loopBackRate.
  // The entry merger combines the throttled source + loopback = treeInputRate.
  const loopBackRate = loopBack * ratePerStream;
  const throttledSourceRate = count * ratePerStream;

  const entryMerger = createNode('merger', treeInputRate);
  link(source, entryMerger, throttledSourceRate);

  const allStreams = buildSplitTree(
    entryMerger,
    treeInputRate,
    smooth,
    ratePerStream,
  );

  const excess = allStreams.splice(count, loopBack);
  if (excess.length > 0) {
    const merged = mergeStreamNodes(excess);
    link(merged, entryMerger, loopBackRate);
  }

  return allStreams;
}

/**
 * When the total stream count * ratePerStream exceeds belt capacity,
 * pre-split into 2 or 3 sub-groups, each with a proportional share
 * of the source rate, and recurse into splitIntoStreams for each.
 */
function preSplitIntoGroups(
  parent: ConveyorNode,
  inputRate: number,
  count: number,
  ratePerStream: number,
  maxBeltSpeed: number,
): ConveyorNode[] {
  const splitter = createNode('splitter', inputRate);
  link(parent, splitter, inputRate);

  // Try 2-way then 3-way groupings to find sub-groups that fit
  for (const ways of [2, 3] as const) {
    const baseSize = Math.floor(count / ways);
    const remainder = count - baseSize * ways;
    const groups: number[] = [];
    for (let i = 0; i < ways; i++) {
      groups.push(baseSize + (i < remainder ? 1 : 0));
    }

    const leaves: ConveyorNode[] = [];
    for (const g of groups) {
      const groupRate = g * ratePerStream;
      const child = createNode('splitter', groupRate);
      link(splitter, child, groupRate);
      leaves.push(...splitIntoStreams(child, g, ratePerStream, maxBeltSpeed));
    }
    return leaves;
  }

  return [parent];
}

/**
 * Build a pure split tree (no loop-backs) that divides `inputRate`
 * into `count` streams of `ratePerStream` each.
 */
function buildSplitTree(
  parent: ConveyorNode,
  inputRate: number,
  count: number,
  ratePerStream: number,
): ConveyorNode[] {
  if (count <= 1) return [parent];

  const splitter = createNode('splitter', inputRate);
  link(parent, splitter, inputRate);

  if (count <= 3) {
    // Direct split into `count` outputs
    const leaves: ConveyorNode[] = [];
    for (let i = 0; i < count; i++) {
      const leaf = createNode('splitter', ratePerStream);
      link(splitter, leaf, ratePerStream);
      leaves.push(leaf);
    }
    return leaves;
  }

  // Decompose into sub-groups using 2 or 3-way split
  if (count % 3 === 0) {
    const subCount = count / 3;
    const groupRate = subCount * ratePerStream;
    const leaves: ConveyorNode[] = [];
    for (let i = 0; i < 3; i++) {
      const child = createNode('splitter', groupRate);
      link(splitter, child, groupRate);
      leaves.push(...buildSplitTree(child, groupRate, subCount, ratePerStream));
    }
    return leaves;
  }

  if (count % 2 === 0) {
    const subCount = count / 2;
    const groupRate = subCount * ratePerStream;
    const leaves: ConveyorNode[] = [];
    for (let i = 0; i < 2; i++) {
      const child = createNode('splitter', groupRate);
      link(splitter, child, groupRate);
      leaves.push(...buildSplitTree(child, groupRate, subCount, ratePerStream));
    }
    return leaves;
  }

  // Odd count not divisible by 3 — use 3-way with uneven sub-groups
  // Split into 3 outputs: floor, floor, remainder
  const small = Math.floor(count / 3);
  const large = count - 2 * small;
  const groups = [small, small, large];
  const leaves: ConveyorNode[] = [];
  for (const g of groups) {
    const groupRate = g * ratePerStream;
    const child = createNode('splitter', groupRate);
    link(splitter, child, groupRate);
    leaves.push(...buildSplitTree(child, groupRate, g, ratePerStream));
  }
  return leaves;
}

/**
 * Merge a set of streams into a single output using 3-way mergers.
 */
function mergeStreamNodes(streams: ConveyorNode[]): ConveyorNode {
  if (streams.length === 1) return streams[0];

  let current = [...streams];

  while (current.length > 1) {
    const next: ConveyorNode[] = [];
    for (let i = 0; i < current.length; i += MAX_MERGE) {
      const group = current.slice(i, i + MAX_MERGE);
      if (group.length === 1) {
        next.push(group[0]);
        continue;
      }
      const totalRate = group.reduce((sum, n) => sum + n.holding, 0);
      const merger = createNode('merger', totalRate);
      for (const node of group) {
        link(node, merger, node.holding);
      }
      next.push(merger);
    }
    current = next;
  }

  return current[0];
}

/**
 * Collect all unique nodes and links from a set of root nodes.
 */
function collectGraph(roots: ConveyorNode[]): {
  nodes: ConveyorNode[];
  links: ConveyorLink[];
} {
  const visited = new Set<string>();
  const allNodes: ConveyorNode[] = [];
  const allLinks: ConveyorLink[] = [];

  function walk(node: ConveyorNode) {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    allNodes.push(node);
    for (const child of node.children) {
      allLinks.push(child);
      walk(child.to);
    }
  }

  for (const root of roots) {
    walk(root);
  }

  return { nodes: allNodes, links: allLinks };
}

/**
 * Remove pass-through nodes (single input, single output).
 * Collapses A -> passthrough -> B into A -> B.
 */
function removePassthroughs(nodes: ConveyorNode[], links: ConveyorLink[]) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (
        node.type !== 'source' &&
        node.type !== 'target' &&
        node.parents.length === 1 &&
        node.children.length === 1
      ) {
        const parentLink = node.parents[0];
        const childLink = node.children[0];
        const parent = parentLink.from;
        const child = childLink.to;

        // Don't collapse if this is a loop-back target
        if (child === node || parent === node) continue;

        // Rewire parent -> child
        const idx = parent.children.indexOf(parentLink);
        if (idx >= 0) parent.children.splice(idx, 1);
        const cidx = child.parents.indexOf(childLink);
        if (cidx >= 0) child.parents.splice(cidx, 1);

        const li1 = links.indexOf(parentLink);
        if (li1 >= 0) links.splice(li1, 1);
        const li2 = links.indexOf(childLink);
        if (li2 >= 0) links.splice(li2, 1);

        link(parent, child, childLink.carrying);
        links.push(parent.children[parent.children.length - 1]);

        const ni = nodes.indexOf(node);
        if (ni >= 0) nodes.splice(ni, 1);

        changed = true;
        break;
      }
    }
  }

  if (mergeParallelEdges(nodes, links)) {
    removePassthroughs(nodes, links);
  }
}

/**
 * After passthrough removal, two leaf nodes that fed the same merger
 * from the same splitter get collapsed into duplicate edges between
 * the same node pair. Merge them into a single edge with combined rate.
 */
function mergeParallelEdges(
  _nodes: ConveyorNode[],
  links: ConveyorLink[],
): boolean {
  let merged = false;
  for (const node of _nodes) {
    const edgesByTarget = new Map<string, ConveyorLink[]>();
    for (const childLink of node.children) {
      const key = childLink.to.id;
      const existing = edgesByTarget.get(key);
      if (existing) {
        existing.push(childLink);
      } else {
        edgesByTarget.set(key, [childLink]);
      }
    }

    for (const [, group] of edgesByTarget) {
      if (group.length <= 1) continue;

      merged = true;
      const combinedRate = group.reduce((sum, l) => sum + l.carrying, 0);
      const target = group[0].to;

      for (const l of group) {
        const ci = node.children.indexOf(l);
        if (ci >= 0) node.children.splice(ci, 1);
        const pi = target.parents.indexOf(l);
        if (pi >= 0) target.parents.splice(pi, 1);
        const li = links.indexOf(l);
        if (li >= 0) links.splice(li, 1);
      }

      link(node, target, combinedRate);
      links.push(node.children[node.children.length - 1]);
    }
  }
  return merged;
}

function getBeltTiers(maxBeltSpeed: number): BeltTier[] {
  return FactoryConveyorBelts.filter(b => b.conveyor!.speed <= maxBeltSpeed)
    .map(b => ({ name: b.name, speed: b.conveyor!.speed }))
    .sort((a, b) => a.speed - b.speed);
}

/**
 * Main entry point: calculate a splitter/merger network.
 */
export function calculateSplitterNetwork(
  request: SplitterRequest,
): SplitterResult {
  nodeIdCounter = 0;

  const sourceRates: number[] = [];
  for (const s of request.sources) {
    for (let i = 0; i < s.count; i++) {
      sourceRates.push(s.rate);
    }
  }
  const targetRates: number[] = [];
  for (const t of request.targets) {
    for (let i = 0; i < t.count; i++) {
      targetRates.push(t.rate);
    }
  }

  const totalSource = sourceRates.reduce((a, b) => a + b, 0);
  const totalTarget = targetRates.reduce((a, b) => a + b, 0);

  if (sourceRates.length === 0 || targetRates.length === 0) {
    return {
      nodes: [],
      links: [],
      error: 'Need at least one source and one target.',
    };
  }

  if (totalTarget > totalSource + 0.01) {
    return {
      nodes: [],
      links: [],
      error: `Target total (${totalTarget}/min) exceeds source total (${totalSource}/min). Sources must provide at least as much as targets require.`,
    };
  }

  const leftover = totalSource - totalTarget;
  if (leftover > 0.01) {
    targetRates.push(leftover);
  }

  const allRates = [...sourceRates, ...targetRates];
  const intRatios = toIntegerRatios(allRates);
  const intSources = intRatios.slice(0, sourceRates.length);
  const intTargets = intRatios.slice(sourceRates.length);
  const totalUnits = intSources.reduce((a, b) => a + b, 0);
  const unitRate = totalSource / totalUnits;

  // Step 1: Create source nodes
  const sourceNodes: ConveyorNode[] = sourceRates.map((rate, i) =>
    createNode('source', rate, `Source ${i + 1}`),
  );

  // Step 2: Split each source into unit streams
  const allLeaves: ConveyorNode[] = [];
  for (let i = 0; i < sourceNodes.length; i++) {
    const leaves = splitIntoStreams(
      sourceNodes[i],
      intSources[i],
      unitRate,
      request.maxBeltSpeed,
    );
    allLeaves.push(...leaves);
  }

  // Step 3: Assign leaves to targets and merge
  const targetNodes: ConveyorNode[] = [];
  let leafIdx = 0;
  const hasLeftover = leftover > 0.01;

  for (let t = 0; t < targetRates.length; t++) {
    const count = intTargets[t];
    const streams = allLeaves.slice(leafIdx, leafIdx + count);
    leafIdx += count;

    const merged = mergeStreamNodes(streams);
    const isLeftover = hasLeftover && t === targetRates.length - 1;
    const target = createNode(
      'target',
      targetRates[t],
      isLeftover
        ? `Leftover: ${targetRates[t]}/min`
        : `Target ${t + 1}: ${targetRates[t]}/min`,
    );
    link(merged, target, targetRates[t]);
    targetNodes.push(target);
  }

  // Step 4: Collect and clean up
  const graph = collectGraph(sourceNodes);
  removePassthroughs(graph.nodes, graph.links);

  return graph;
}

export function getBeltForRate(
  rate: number,
  maxBeltSpeed: number,
): BeltTier | null {
  const tiers = getBeltTiers(maxBeltSpeed);
  for (const tier of tiers) {
    if (rate <= tier.speed + 0.01) return tier;
  }
  return tiers[tiers.length - 1] ?? null;
}

export function isExactBeltSpeed(
  rate: number,
  maxBeltSpeed: number,
): BeltTier | null {
  const tiers = getBeltTiers(maxBeltSpeed);
  for (const tier of tiers) {
    if (Math.abs(rate - tier.speed) < 0.01) return tier;
  }
  return null;
}
