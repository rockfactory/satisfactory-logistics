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

// ---------------------------------------------------------------------------
// Decomposition strategy types
// ---------------------------------------------------------------------------

interface TargetDecomposition {
  directStreams: number;
  chainOutputs: number;
  chainLength: number;
}

interface DecompositionStrategy {
  k: number;
  streamRate: number;
  totalStreams: number;
  targets: TargetDecomposition[];
  chainLength: number;
  chainSourcesNeeded: number;
  score: number;
}

// ---------------------------------------------------------------------------
// Strategy search
// ---------------------------------------------------------------------------

function tryDecompositionStrategy(
  k: number,
  sourceRate: number,
  numSources: number,
  targetRates: number[],
  maxBeltSpeed: number,
): DecompositionStrategy | null {
  const streamRate = sourceRate / k;
  if (streamRate > maxBeltSpeed + 0.01) return null;

  const totalStreams = numSources * k;
  const targets: TargetDecomposition[] = [];
  let totalDirectNeeded = 0;
  let totalChainOutputsNeeded = 0;
  let commonChainLength = 0;

  for (const T of targetRates) {
    if (T > maxBeltSpeed + 0.01) return null;

    const directStreams = Math.floor(T / streamRate + 0.001);
    const remainder = T - directStreams * streamRate;

    if (Math.abs(remainder) < 0.01) {
      targets.push({ directStreams, chainOutputs: 0, chainLength: 0 });
      totalDirectNeeded += directStreams;
      continue;
    }

    if (remainder < -0.01) return null;

    const n = Math.round(streamRate / remainder);
    if (Math.abs(streamRate / n - remainder) > 0.01) return null;
    if (n < 2) return null;

    // All targets must use the same chain length for shared chains
    if (commonChainLength === 0) {
      commonChainLength = n;
    } else if (commonChainLength !== n) {
      return null;
    }

    targets.push({ directStreams, chainOutputs: 1, chainLength: n });
    totalDirectNeeded += directStreams;
    totalChainOutputsNeeded += 1;
  }

  const chainSourcesNeeded =
    commonChainLength > 0
      ? Math.ceil(totalChainOutputsNeeded / commonChainLength)
      : 0;
  const totalStreamsNeeded = totalDirectNeeded + chainSourcesNeeded;

  if (totalStreamsNeeded > totalStreams) return null;

  // Score: initial splitters + chain splitters + mergers
  const initialSplitters = k > 1 ? numSources : 0;
  const chainSplitters =
    commonChainLength > 0 ? chainSourcesNeeded * (commonChainLength - 1) : 0;
  const mergers = targets.filter(
    t => t.directStreams > 0 && t.chainOutputs > 0,
  ).length;
  const multiMergers = targets.filter(t => t.directStreams > 1).length;
  const score = initialSplitters + chainSplitters + mergers + multiMergers;

  return {
    k,
    streamRate,
    totalStreams,
    targets,
    chainLength: commonChainLength,
    chainSourcesNeeded,
    score,
  };
}

// ---------------------------------------------------------------------------
// Chain builder
// ---------------------------------------------------------------------------

/**
 * Build a splitter chain that produces `chainLength` equal outputs via
 * back-pressure. Each splitter in the chain taps one output and passes
 * the rest forward to the next splitter.
 *
 * In-game, back-pressure causes each splitter to output items at the
 * same rate: inputRate / chainLength per output.
 */
function buildChain(
  source: ConveyorNode,
  chainLength: number,
  outputRate: number,
): ConveyorNode[] {
  const outputs: ConveyorNode[] = [];
  let current = source;

  for (let i = 0; i < chainLength - 1; i++) {
    const remainingCount = chainLength - i;
    const throughRate = remainingCount * outputRate;
    const splitter = createNode('splitter', throughRate);
    link(current, splitter, throughRate);

    const tap = createNode('splitter', outputRate);
    link(splitter, tap, outputRate);
    outputs.push(tap);

    current = splitter;
  }

  // Last output comes directly from the final splitter
  const lastTap = createNode('splitter', outputRate);
  link(current, lastTap, outputRate);
  outputs.push(lastTap);

  return outputs;
}

// ---------------------------------------------------------------------------
// Graph builder for decomposition strategy
// ---------------------------------------------------------------------------

function buildDecompositionGraph(
  strategy: DecompositionStrategy,
  sourceRates: number[],
  targetRates: number[],
  leftover: number,
): SplitterResult {
  const { k, streamRate, targets, chainLength, chainSourcesNeeded } = strategy;
  const numSources = sourceRates.length;
  const hasLeftover = leftover > 0.01;

  // Step 1: Create source nodes and initial splits
  const sourceNodes: ConveyorNode[] = [];
  const allStreams: ConveyorNode[] = [];

  for (let i = 0; i < numSources; i++) {
    const src = createNode('source', sourceRates[i], `Source ${i + 1}`);
    sourceNodes.push(src);

    if (k === 1) {
      allStreams.push(src);
    } else {
      const splitter = createNode('splitter', sourceRates[i]);
      link(src, splitter, sourceRates[i]);
      for (let j = 0; j < k; j++) {
        const out = createNode('splitter', streamRate);
        link(splitter, out, streamRate);
        allStreams.push(out);
      }
    }
  }

  // Step 2: Separate chain-source streams from direct streams
  const chainStreams = allStreams.splice(
    allStreams.length - chainSourcesNeeded,
  );
  const directStreams = allStreams;

  // Step 3: Build chains
  const chainOutputRate = chainLength > 0 ? streamRate / chainLength : 0;
  const allChainOutputs: ConveyorNode[] = [];
  for (const cs of chainStreams) {
    const outputs = buildChain(cs, chainLength, chainOutputRate);
    allChainOutputs.push(...outputs);
  }

  // Step 4: Assign streams to targets and build mergers
  let directIdx = 0;
  let chainIdx = 0;
  const targetNodes: ConveyorNode[] = [];

  for (let t = 0; t < targetRates.length; t++) {
    const decomp = targets[t];
    const isLeftover = hasLeftover && t === targetRates.length - 1;
    const label = isLeftover
      ? `Leftover: ${targetRates[t]}/min`
      : `Target ${t + 1}: ${targetRates[t]}/min`;

    const inputNodes: ConveyorNode[] = [];

    for (let d = 0; d < decomp.directStreams; d++) {
      inputNodes.push(directStreams[directIdx++]);
    }
    for (let c = 0; c < decomp.chainOutputs; c++) {
      inputNodes.push(allChainOutputs[chainIdx++]);
    }

    const merged = mergeStreamNodes(inputNodes);
    const target = createNode('target', targetRates[t], label);
    link(merged, target, targetRates[t]);
    targetNodes.push(target);
  }

  // Step 5: Handle unused streams as leftover
  const unusedDirect = directStreams.slice(directIdx);
  const unusedChain = allChainOutputs.slice(chainIdx);
  const unused = [...unusedDirect, ...unusedChain];
  if (unused.length > 0) {
    const merged = mergeStreamNodes(unused);
    const unusedRate = unused.reduce((s, n) => s + n.holding, 0);
    const target = createNode(
      'target',
      unusedRate,
      `Leftover: ${unusedRate}/min`,
    );
    link(merged, target, unusedRate);
    targetNodes.push(target);
  }

  // Step 6: Collect and clean up
  const graph = collectGraph(sourceNodes);
  removePassthroughs(graph.nodes, graph.links);

  return graph;
}

// ---------------------------------------------------------------------------
// Shared graph utilities
// ---------------------------------------------------------------------------

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

        if (child === node || parent === node) continue;

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

// ---------------------------------------------------------------------------
// Fallback: unit-rate algorithm (previous approach)
// ---------------------------------------------------------------------------

function fallbackCalculation(
  sourceRates: number[],
  targetRates: number[],
  leftover: number,
  maxBeltSpeed: number,
): SplitterResult {
  const hasLeftover = leftover > 0.01;
  const allRates = [...sourceRates, ...targetRates];
  const intRatios = toIntegerRatios(allRates);
  const intSources = intRatios.slice(0, sourceRates.length);
  const intTargets = intRatios.slice(sourceRates.length);
  const totalSource = sourceRates.reduce((a, b) => a + b, 0);
  const totalUnits = intSources.reduce((a, b) => a + b, 0);
  const unitRate = totalSource / totalUnits;

  const sourceNodes: ConveyorNode[] = sourceRates.map((rate, i) =>
    createNode('source', rate, `Source ${i + 1}`),
  );

  const allLeaves: ConveyorNode[] = [];
  for (let i = 0; i < sourceNodes.length; i++) {
    const leaves = splitIntoStreams(
      sourceNodes[i],
      intSources[i],
      unitRate,
      maxBeltSpeed,
    );
    allLeaves.push(...leaves);
  }

  const targetNodes: ConveyorNode[] = [];
  let leafIdx = 0;

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

  const graph = collectGraph(sourceNodes);
  removePassthroughs(graph.nodes, graph.links);

  return graph;
}

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

  if (treeInputRate > maxBeltSpeed + 0.01) {
    return preSplitIntoGroups(
      source,
      sourceRate,
      count,
      ratePerStream,
      maxBeltSpeed,
    );
  }

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

function preSplitIntoGroups(
  parent: ConveyorNode,
  inputRate: number,
  count: number,
  ratePerStream: number,
  maxBeltSpeed: number,
): ConveyorNode[] {
  const splitter = createNode('splitter', inputRate);
  link(parent, splitter, inputRate);

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
    const leaves: ConveyorNode[] = [];
    for (let i = 0; i < count; i++) {
      const leaf = createNode('splitter', ratePerStream);
      link(splitter, leaf, ratePerStream);
      leaves.push(leaf);
    }
    return leaves;
  }

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

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

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

  if (request.useDecomposition) {
    const uniqueSourceRates = new Set(sourceRates);

    if (uniqueSourceRates.size === 1) {
      const sourceRate = sourceRates[0];

      const strategies: DecompositionStrategy[] = [];
      for (const k of [1, 2, 3]) {
        const strategy = tryDecompositionStrategy(
          k,
          sourceRate,
          sourceRates.length,
          targetRates,
          request.maxBeltSpeed,
        );
        if (strategy) strategies.push(strategy);
      }

      if (strategies.length > 0) {
        strategies.sort((a, b) => a.score - b.score);
        const best = strategies[0];
        return buildDecompositionGraph(
          best,
          sourceRates,
          targetRates,
          leftover,
        );
      }
    }
  }

  return fallbackCalculation(
    sourceRates,
    targetRates,
    leftover,
    request.maxBeltSpeed,
  );
}

// ---------------------------------------------------------------------------
// Belt tier utilities (unchanged)
// ---------------------------------------------------------------------------

function getBeltTiers(maxBeltSpeed: number): BeltTier[] {
  return FactoryConveyorBelts.filter(b => b.conveyor!.speed <= maxBeltSpeed)
    .map(b => ({ name: b.name, speed: b.conveyor!.speed }))
    .sort((a, b) => a.speed - b.speed);
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
