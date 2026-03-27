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

/**
 * Interleave arrays so consecutive elements come from different groups.
 * [A1,A2,A3], [B1,B2,B3] → [A1,B1,A2,B2,A3,B3]
 */
function interleaveGroups<T>(groups: T[][]): T[] {
  const result: T[] = [];
  const maxLen = Math.max(...groups.map(g => g.length));
  for (let i = 0; i < maxLen; i++) {
    for (const group of groups) {
      if (i < group.length) {
        result.push(group[i]);
      }
    }
  }
  return result;
}

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
      if (node.type === 'source' || node.type === 'target') continue;

      // Standard passthrough: 1 parent, 1 child → bypass
      if (node.parents.length === 1 && node.children.length === 1) {
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

      // Redundant fan-out: a splitter where ALL outputs go to the same
      // single node (e.g., 3×240 all feeding one merger). The splitter
      // is unnecessary — replace with a direct connection at the combined rate.
      if (
        node.type === 'splitter' &&
        node.children.length >= 2 &&
        node.parents.length === 1
      ) {
        const onlyTarget = node.children[0].to;
        if (
          onlyTarget !== node &&
          node.children.every(l => l.to === onlyTarget)
        ) {
          const parentLink = node.parents[0];
          const parent = parentLink.from;
          const combinedRate = node.children.reduce(
            (sum, l) => sum + l.carrying,
            0,
          );

          // Remove all links from this splitter
          for (const childLink of [...node.children]) {
            const pi = onlyTarget.parents.indexOf(childLink);
            if (pi >= 0) onlyTarget.parents.splice(pi, 1);
            const li = links.indexOf(childLink);
            if (li >= 0) links.splice(li, 1);
          }
          node.children.length = 0;

          const pi2 = parent.children.indexOf(parentLink);
          if (pi2 >= 0) parent.children.splice(pi2, 1);
          node.parents.length = 0;
          const li3 = links.indexOf(parentLink);
          if (li3 >= 0) links.splice(li3, 1);

          link(parent, onlyTarget, combinedRate);
          links.push(parent.children[parent.children.length - 1]);

          const ni = nodes.indexOf(node);
          if (ni >= 0) nodes.splice(ni, 1);

          changed = true;
          break;
        }
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
    // Splitters always have equal outputs. Merging two 240 edges into
    // one 480 edge would misrepresent the physical output count, so
    // skip splitters here. The rendering layer merges them for display.
    if (node.type === 'splitter') continue;

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

/**
 * Pick `count` leaves for a target, preferring siblings that share
 * the same parent splitter. When a splitter's children all go to the
 * same target, the fan-out optimization collapses the redundant split.
 */
function pickSiblingGroup(
  allLeaves: ConveyorNode[],
  used: Set<ConveyorNode>,
  count: number,
): ConveyorNode[] {
  // Group available leaves by their parent splitter
  const byParent = new Map<ConveyorNode | null, ConveyorNode[]>();
  for (const leaf of allLeaves) {
    if (used.has(leaf)) continue;
    const parent =
      leaf.parents.length === 1 && leaf.parents[0].from.type === 'splitter'
        ? leaf.parents[0].from
        : null;
    const group = byParent.get(parent);
    if (group) {
      group.push(leaf);
    } else {
      byParent.set(parent, [leaf]);
    }
  }

  // Look for a parent whose available children exactly match `count`
  // (all siblings go to this one target → collapsible fan-out)
  for (const [parent, siblings] of byParent) {
    if (parent === null) continue;
    const totalChildren = parent.children.length;
    if (siblings.length === count && totalChildren === count) {
      for (const s of siblings) used.add(s);
      return siblings;
    }
  }

  // Fallback: take the first `count` unused leaves in order
  const result: ConveyorNode[] = [];
  for (const leaf of allLeaves) {
    if (used.has(leaf)) continue;
    result.push(leaf);
    used.add(leaf);
    if (result.length === count) break;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Flow-assignment: greedily route whole/partial sources to targets
// ---------------------------------------------------------------------------

interface FlowAssignment {
  sourceIdx: number;
  amount: number;
}

/**
 * Try to assign source flows to targets directly, minimizing the number of
 * splitters/mergers. Each target gets a list of (sourceIdx, amount) pairs.
 * A source may contribute its full rate to one target or split across
 * multiple targets.
 *
 * Returns null if the assignment would require splits that can't be
 * realized with equal-output splitters (i.e., the split ratio isn't
 * representable as a 2/3-smooth fraction of the source rate).
 */
function tryFlowAssignment(
  sourceRates: number[],
  targetRates: number[],
  maxBeltSpeed: number,
): FlowAssignment[][] | null {
  const remaining = [...sourceRates];
  const assignments: FlowAssignment[][] = targetRates.map(() => []);

  // Sort target indices by rate descending — fill largest targets first
  const targetOrder = targetRates
    .map((_, i) => i)
    .sort((a, b) => targetRates[b] - targetRates[a]);

  for (const t of targetOrder) {
    let need = targetRates[t];

    // First pass: find sources that exactly match the target
    for (let s = 0; s < remaining.length; s++) {
      if (need < 0.01) break;
      if (Math.abs(remaining[s] - need) < 0.01) {
        assignments[t].push({ sourceIdx: s, amount: remaining[s] });
        need -= remaining[s];
        remaining[s] = 0;
        break;
      }
    }

    // Second pass: consume whole sources that fit entirely
    if (need > 0.01) {
      // Sort available sources descending so we pack large ones first
      const availableIndices = remaining
        .map((r, i) => i)
        .filter(i => remaining[i] > 0.01)
        .sort((a, b) => remaining[b] - remaining[a]);

      for (const s of availableIndices) {
        if (need < 0.01) break;
        if (remaining[s] <= need + 0.01) {
          const take = Math.min(remaining[s], need);
          assignments[t].push({ sourceIdx: s, amount: take });
          need -= take;
          remaining[s] -= take;
        }
      }
    }

    // Third pass: take a partial slice from one source to fill the remainder
    if (need > 0.01) {
      for (let s = 0; s < remaining.length; s++) {
        if (remaining[s] < need - 0.01) continue;
        assignments[t].push({ sourceIdx: s, amount: need });
        remaining[s] -= need;
        need = 0;
        break;
      }
    }

    if (need > 0.01) return null;
  }

  // Validate: each source that is partially consumed must split into
  // amounts that are realizable with equal-output splitters. The split
  // portions must form integer ratios whose denominator is 2/3-smooth.
  for (let s = 0; s < sourceRates.length; s++) {
    const portions: number[] = [];
    for (const targetAssigns of assignments) {
      for (const a of targetAssigns) {
        if (a.sourceIdx === s) portions.push(a.amount);
      }
    }
    if (remaining[s] > 0.01) portions.push(remaining[s]);
    if (portions.length <= 1) continue;

    const ratios = toIntegerRatios(portions);
    const total = ratios.reduce((a, b) => a + b, 0);
    if (!canSplitEvenly(total)) return null;
  }

  // Validate: no belt exceeds max speed. Each assignment to a target
  // arrives on its own belt, plus a final merger belt to the target.
  for (let t = 0; t < targetRates.length; t++) {
    if (targetRates[t] > maxBeltSpeed + 0.01) return null;
    for (const a of assignments[t]) {
      if (a.amount > maxBeltSpeed + 0.01) return null;
    }
  }

  return assignments;
}

/**
 * Check if `n` can be achieved by cascading equal-output splitters.
 * This requires n to be a product of 2s and 3s (3-smooth), or
 * achievable via loop-back (nextSmooth will handle it).
 */
function canSplitEvenly(n: number): boolean {
  // The splitIntoStreams function handles non-smooth counts via loop-back,
  // so any positive integer works — but we prefer smooth ones for simplicity.
  return n >= 1;
}

/**
 * Build the graph from a flow assignment. Each source is split (if needed)
 * into the portions assigned to different targets, and each target merges
 * its incoming flows.
 */
function buildFlowAssignmentGraph(
  sourceRates: number[],
  targetRates: number[],
  assignments: FlowAssignment[][],
  leftover: number,
  maxBeltSpeed: number,
): SplitterResult {
  const hasLeftover = leftover > 0.01;
  const sourceNodes: ConveyorNode[] = sourceRates.map((rate, i) =>
    createNode('source', rate, `Source ${i + 1}`),
  );

  // For each source, collect all the portions it must produce
  const sourcePortions: { amount: number; targetIdx: number }[][] =
    sourceRates.map(() => []);
  const sourceRemainders = [...sourceRates];

  for (let t = 0; t < assignments.length; t++) {
    for (const a of assignments[t]) {
      sourcePortions[a.sourceIdx].push({ amount: a.amount, targetIdx: t });
      sourceRemainders[a.sourceIdx] -= a.amount;
    }
  }

  // For each source, build the split structure and collect output nodes
  // keyed by (sourceIdx, portionIndex)
  const portionNodes: Map<string, ConveyorNode> = new Map();

  for (let s = 0; s < sourceRates.length; s++) {
    const portions = sourcePortions[s];
    const remainder = sourceRemainders[s];
    const allPortionAmounts = portions.map(p => p.amount);
    if (remainder > 0.01) allPortionAmounts.push(remainder);

    if (allPortionAmounts.length <= 1) {
      // Source goes entirely to one target (or is entirely leftover)
      if (portions.length === 1) {
        portionNodes.set(`${s}-0`, sourceNodes[s]);
      }
      continue;
    }

    // Need to split this source. Convert portions to integer ratios
    // and build a split tree.
    const ratios = toIntegerRatios(allPortionAmounts);
    const totalUnits = ratios.reduce((a, b) => a + b, 0);
    const unitRate = sourceRates[s] / totalUnits;

    const leaves = splitIntoStreams(
      sourceNodes[s],
      totalUnits,
      unitRate,
      maxBeltSpeed,
    );

    // Assign leaves to portions: each portion[i] gets ratios[i] leaves
    let leafIdx = 0;
    for (let p = 0; p < portions.length; p++) {
      const count = ratios[p];
      const portionLeaves = leaves.slice(leafIdx, leafIdx + count);
      leafIdx += count;
      const merged = mergeStreamNodes(portionLeaves);
      portionNodes.set(`${s}-${p}`, merged);
    }
    // Remaining leaves (for leftover) are handled below
    if (remainder > 0.01) {
      const leftoverCount = ratios[ratios.length - 1];
      const leftoverLeaves = leaves.slice(leafIdx, leafIdx + leftoverCount);
      const merged = mergeStreamNodes(leftoverLeaves);
      portionNodes.set(`${s}-leftover`, merged);
    }
  }

  // Build target nodes by merging assigned portions
  const targetNodes: ConveyorNode[] = [];
  for (let t = 0; t < targetRates.length; t++) {
    const isLeftover = hasLeftover && t === targetRates.length - 1;
    const inputs: ConveyorNode[] = [];

    for (let a = 0; a < assignments[t].length; a++) {
      const assign = assignments[t][a];
      // Find which portionIndex this is for this source
      let portionIdx = 0;
      for (let prevT = 0; prevT < t; prevT++) {
        for (const prevA of assignments[prevT]) {
          if (prevA.sourceIdx === assign.sourceIdx) portionIdx++;
        }
      }
      const node = portionNodes.get(`${assign.sourceIdx}-${portionIdx}`);
      if (node) inputs.push(node);
    }

    if (inputs.length === 0) continue;

    const merged = mergeStreamNodes(inputs);
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

  // Handle leftover from partially-used sources
  const leftoverInputs: ConveyorNode[] = [];
  for (let s = 0; s < sourceRates.length; s++) {
    if (sourceRemainders[s] > 0.01) {
      const node = portionNodes.get(`${s}-leftover`);
      if (node) {
        leftoverInputs.push(node);
      } else if (sourcePortions[s].length === 0) {
        leftoverInputs.push(sourceNodes[s]);
      }
    }
  }
  if (leftoverInputs.length > 0) {
    const merged = mergeStreamNodes(leftoverInputs);
    const leftoverRate = leftoverInputs.reduce((sum, n) => sum + n.holding, 0);
    const target = createNode(
      'target',
      leftoverRate,
      `Leftover: ${leftoverRate}/min`,
    );
    link(merged, target, leftoverRate);
    targetNodes.push(target);
  }

  const graph = collectGraph(sourceNodes);
  removePassthroughs(graph.nodes, graph.links);
  return graph;
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
  // Try direct flow assignment first — produces much simpler graphs
  // when sources can be routed to targets without full atomization.
  const assignments = tryFlowAssignment(sourceRates, targetRates, maxBeltSpeed);
  if (assignments) {
    return buildFlowAssignmentGraph(
      sourceRates,
      targetRates,
      assignments,
      leftover,
      maxBeltSpeed,
    );
  }

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
  const usedLeaves = new Set<ConveyorNode>();

  for (let t = 0; t < targetRates.length; t++) {
    const count = intTargets[t];
    const isLeftover = hasLeftover && t === targetRates.length - 1;

    const streams = pickSiblingGroup(allLeaves, usedLeaves, count);

    const merged = mergeStreamNodes(streams);
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

  // Loop-back: split into `smooth` (2/3-smooth) equal outputs, loop
  // the excess back via a merger. In-game, the splitter round-robins
  // items across all outputs; back-pressure from the loop-back causes
  // the system to self-regulate so each useful output gets ratePerStream.
  //
  // treeInputRate <= maxBeltSpeed here, so the merger→splitter belt
  // can carry the full expanded rate (source input + loop-back).
  const loopBackRate = loopBack * ratePerStream;

  const entryMerger = createNode('merger', treeInputRate);
  link(source, entryMerger, sourceRate);

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
 * When the total tree input rate exceeds belt speed, pre-split
 * evenly into 2 or 3 groups (all outputs carry the same rate),
 * then recursively split each sub-group.
 *
 * If count divides evenly by 2 or 3, each sub-group gets count/ways
 * streams. Otherwise, uses the "distributed merger" pattern:
 *   1. Split source N-way into equal chunks
 *   2. Each chunk feeds a per-group merger
 *   3. Each merger also receives a share of looped-back excess
 *   4. Each merger feeds a sub-split of perGroup outputs
 *   5. Excess outputs loop back through a splitter to the mergers
 * This avoids a centralized bottleneck belt that would exceed maxBeltSpeed.
 */
function preSplitIntoGroups(
  parent: ConveyorNode,
  inputRate: number,
  count: number,
  ratePerStream: number,
  maxBeltSpeed: number,
): ConveyorNode[] {
  for (const ways of [2, 3] as const) {
    const groupRate = inputRate / ways;
    if (groupRate > maxBeltSpeed + 0.01) continue;

    if (count % ways === 0) {
      const groupSize = count / ways;
      const splitter = createNode('splitter', inputRate);
      link(parent, splitter, inputRate);

      const groupLeaves: ConveyorNode[][] = [];
      for (let i = 0; i < ways; i++) {
        const child = createNode('splitter', groupRate);
        link(splitter, child, groupRate);
        groupLeaves.push(
          splitIntoStreams(child, groupSize, ratePerStream, maxBeltSpeed),
        );
      }
      return interleaveGroups(groupLeaves);
    }

    // count doesn't divide evenly — use distributed merger pattern.
    // Split source N-way, give each sub-group a merger that also
    // receives a share of the loop-back. This keeps all belts
    // within maxBeltSpeed.
    const perGroup = Math.ceil(count / ways);
    const totalOutputs = perGroup * ways;
    const excess = totalOutputs - count;
    const loopBackRate = excess * ratePerStream;
    const loopBackPerMerger = loopBackRate / ways;
    const mergerOutputRate = perGroup * ratePerStream;

    // Step 1: Split source into `ways` equal streams
    const mainSplitter = createNode('splitter', inputRate);
    link(parent, mainSplitter, inputRate);

    // Step 2: Create per-group mergers that combine main + loop-back
    const mergers: ConveyorNode[] = [];
    for (let i = 0; i < ways; i++) {
      const merger = createNode('merger', mergerOutputRate);
      link(mainSplitter, merger, groupRate);
      mergers.push(merger);
    }

    // Step 3: Recursively split each merger's output
    const groupLeaves: ConveyorNode[][] = [];
    for (let i = 0; i < ways; i++) {
      groupLeaves.push(
        splitIntoStreams(
          mergers[i],
          perGroup,
          ratePerStream,
          maxBeltSpeed,
        ),
      );
    }

    // Interleave so consecutive leaves come from different groups,
    // ensuring downstream mergers draw from different splitters.
    const allLeaves = interleaveGroups(groupLeaves);

    // Step 4: Loop back excess outputs to the distributed mergers.
    // Excess are the last `excess` leaves (from the tail of each group).
    const excessLeaves = allLeaves.splice(count, excess);
    if (excessLeaves.length > 0) {
      if (excessLeaves.length === 1 && ways <= 3) {
        const loopBackSplitter = createNode('splitter', loopBackRate);
        link(excessLeaves[0], loopBackSplitter, loopBackRate);
        for (const merger of mergers) {
          link(loopBackSplitter, merger, loopBackPerMerger);
        }
      } else {
        const merged = mergeStreamNodes(excessLeaves);
        const loopBackSplitter = createNode('splitter', loopBackRate);
        link(merged, loopBackSplitter, loopBackRate);
        for (const merger of mergers) {
          link(loopBackSplitter, merger, loopBackPerMerger);
        }
      }
    }

    return allLeaves;
  }

  throw new Error(
    `preSplitIntoGroups: could not split count=${count} within maxBeltSpeed=${maxBeltSpeed}`,
  );
}

/**
 * Recursively split a stream into `count` equal sub-streams.
 * Only uses even divisions (2-way or 3-way) since splitters
 * always divide equally across their outputs.
 * Count must be 2/3-smooth (only factors of 2 and 3).
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
    const perOutput = inputRate / count;
    const leaves: ConveyorNode[] = [];
    for (let i = 0; i < count; i++) {
      const leaf = createNode('splitter', perOutput);
      link(splitter, leaf, perOutput);
      leaves.push(leaf);
    }
    return leaves;
  }

  if (count % 3 === 0) {
    const subCount = count / 3;
    const groupRate = inputRate / 3;
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
    const groupRate = inputRate / 2;
    const leaves: ConveyorNode[] = [];
    for (let i = 0; i < 2; i++) {
      const child = createNode('splitter', groupRate);
      link(splitter, child, groupRate);
      leaves.push(...buildSplitTree(child, groupRate, subCount, ratePerStream));
    }
    return leaves;
  }

  // Should not reach here — count should be 2/3-smooth by the time
  // buildSplitTree is called.
  throw new Error(`buildSplitTree called with non-smooth count: ${count}`);
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
