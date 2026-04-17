import { FactoryConveyorBelts } from '@/recipes/FactoryBuilding';
import { isSmooth, nextSmooth, toIntegerRatios } from './fraction';
import type {
  BeltTier,
  ConveyorLink,
  ConveyorNode,
  RateApproximation,
  SplitterRequest,
  SplitterResult,
} from './types';

const MAX_MERGE = 3;

let nodeIdCounter = 0;
let solveDepth = 0;

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

function collectGraph(roots: ConveyorNode[]): SplitterResult {
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
 * Score a flow assignment by the total integer ratio units across all sources.
 * Lower = simpler graph.
 */
function scoreFlowAssignment(
  sourceRates: number[],
  assignments: FlowAssignment[][],
  remaining: number[],
): number {
  let totalUnits = 0;
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
    totalUnits += ratios.reduce((a, b) => a + b, 0);
  }
  return totalUnits;
}

/**
 * Run the greedy flow assignment with a given target ordering.
 * Returns the assignments and remaining source amounts, or null if infeasible.
 */
function greedyFlowAssign(
  sourceRates: number[],
  targetRates: number[],
  targetOrder: number[],
  maxBeltSpeed: number,
): { assignments: FlowAssignment[][]; remaining: number[] } | null {
  const remaining = [...sourceRates];
  const assignments: FlowAssignment[][] = targetRates.map(() => []);

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

    // Third pass: prefer sources that split into clean fractions
    if (need > 0.01) {
      let bestSource = -1;
      let bestSmoothScore = Infinity;
      for (let s = 0; s < remaining.length; s++) {
        if (remaining[s] < need - 0.01) continue;
        const leftAfter = remaining[s] - need;
        const portions = leftAfter > 0.01 ? [need, leftAfter] : [need];
        if (portions.length > 1) {
          const ratios = toIntegerRatios(portions);
          const total = ratios.reduce((a, b) => a + b, 0);
          if (total < bestSmoothScore) {
            bestSmoothScore = total;
            bestSource = s;
          }
        } else {
          bestSource = s;
          bestSmoothScore = 1;
          break;
        }
      }
      if (bestSource >= 0) {
        assignments[t].push({ sourceIdx: bestSource, amount: need });
        remaining[bestSource] -= need;
        need = 0;
      }
    }

    if (need > 0.01) return null;
  }

  // Validate belt speeds
  for (let t = 0; t < targetRates.length; t++) {
    if (targetRates[t] > maxBeltSpeed + 0.01) return null;
    for (const a of assignments[t]) {
      if (a.amount > maxBeltSpeed + 0.01) return null;
    }
  }

  return { assignments, remaining };
}

/**
 * Try to assign source flows to targets directly, minimizing the number of
 * splitters/mergers. Tries multiple target orderings and picks the assignment
 * that produces the smoothest (lowest total unit count) splits.
 *
 * Returns null if no ordering produces a valid assignment.
 */
function tryFlowAssignment(
  sourceRates: number[],
  targetRates: number[],
  maxBeltSpeed: number,
): FlowAssignment[][] | null {
  const indices = targetRates.map((_, i) => i);

  // Generate candidate orderings
  const orderings: number[][] = [
    // Largest targets first (original strategy)
    [...indices].sort((a, b) => targetRates[b] - targetRates[a]),
    // Smallest targets first (may leave clean remainders for large targets)
    [...indices].sort((a, b) => targetRates[a] - targetRates[b]),
  ];

  // Also try: targets that exactly match a source rate first
  const sourceSet = new Set(sourceRates.map(r => Math.round(r * 100)));
  const exactFirst = [...indices].sort((a, b) => {
    const aExact = sourceSet.has(Math.round(targetRates[a] * 100)) ? 0 : 1;
    const bExact = sourceSet.has(Math.round(targetRates[b] * 100)) ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    return targetRates[b] - targetRates[a];
  });
  orderings.push(exactFirst);

  // Also try: targets that are clean fractions of sources first
  const cleanFractionFirst = [...indices].sort((a, b) => {
    const aClean = sourceRates.some(sr => {
      const ratio = sr / targetRates[a];
      return (
        Math.abs(ratio - Math.round(ratio)) < 0.01 &&
        isSmooth(Math.round(ratio))
      );
    })
      ? 0
      : 1;
    const bClean = sourceRates.some(sr => {
      const ratio = sr / targetRates[b];
      return (
        Math.abs(ratio - Math.round(ratio)) < 0.01 &&
        isSmooth(Math.round(ratio))
      );
    })
      ? 0
      : 1;
    if (aClean !== bClean) return aClean - bClean;
    return targetRates[b] - targetRates[a];
  });
  orderings.push(cleanFractionFirst);

  let bestResult: FlowAssignment[][] | null = null;
  let bestScore = Infinity;

  for (const order of orderings) {
    const result = greedyFlowAssign(
      sourceRates,
      targetRates,
      order,
      maxBeltSpeed,
    );
    if (!result) continue;

    const score = scoreFlowAssignment(
      sourceRates,
      result.assignments,
      result.remaining,
    );
    if (score < bestScore) {
      bestScore = score;
      bestResult = result.assignments;
    }
  }

  // Reject if the best assignment would still produce too many unit streams
  if (bestScore > MAX_COMPLEXITY_UNITS) return null;

  return bestResult;
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
// Approximate rate finder
// ---------------------------------------------------------------------------

const MAX_COMPLEXITY_UNITS = 100;
const MAX_DEVIATION = 0.05; // 5%

/**
 * Generate candidate replacement rates for a target that would produce
 * simpler integer ratios when combined with the source rates.
 */
function generateCandidateRates(
  targetRate: number,
  sourceRates: number[],
  maxDeviation: number,
): number[] {
  const candidates = new Set<number>();
  candidates.add(targetRate);

  const minRate = targetRate * (1 - maxDeviation);
  const maxRate = targetRate * (1 + maxDeviation);

  // Clean fractions of each source rate
  const fractions = [1, 2, 3, 4, 6, 8, 9, 12, 16, 18, 24, 27];
  for (const sr of sourceRates) {
    for (const f of fractions) {
      const candidate = sr / f;
      if (candidate >= minRate && candidate <= maxRate) {
        candidates.add(candidate);
      }
      // Also try multiples (for merging)
      for (const m of [2, 3]) {
        const mc = (sr * m) / f;
        if (mc >= minRate && mc <= maxRate) {
          candidates.add(mc);
        }
      }
    }
  }

  // Nearby integers
  const lo = Math.ceil(minRate);
  const hi = Math.floor(maxRate);
  for (let r = lo; r <= hi; r++) {
    candidates.add(r);
  }

  return [...candidates].sort((a, b) => {
    // Prefer rates closer to the original
    return Math.abs(a - targetRate) - Math.abs(b - targetRate);
  });
}

/**
 * When exact integer ratios would produce too many unit streams,
 * find nearby target rates that result in much smaller total units.
 *
 * Returns null if no useful approximation exists (exact is fine or
 * nothing better was found within tolerance).
 */
function findApproximateRates(
  sourceRates: number[],
  targetRates: number[],
  maxDeviation: number = MAX_DEVIATION,
): { rates: number[]; approximations: RateApproximation[] } | null {
  const allRates = [...sourceRates, ...targetRates];
  const exactRatios = toIntegerRatios(allRates);
  const exactTotal = exactRatios.reduce((a, b) => a + b, 0);

  if (exactTotal <= MAX_COMPLEXITY_UNITS) return null;

  // Generate candidates for each target
  const candidatesPerTarget = targetRates.map(rate =>
    generateCandidateRates(rate, sourceRates, maxDeviation),
  );

  let bestRates: number[] | null = null;
  let bestTotal = exactTotal;

  // Optimization: find groups of identical target rates. When multiple
  // targets share the same rate, we only need to try candidates once per
  // unique rate, then apply the same replacement to all.
  const uniqueRates = [...new Set(targetRates)];
  const rateIndices = new Map<number, number[]>();
  for (let i = 0; i < targetRates.length; i++) {
    const r = targetRates[i];
    if (!rateIndices.has(r)) rateIndices.set(r, []);
    rateIndices.get(r)!.push(i);
  }

  // Try replacing each unique rate group uniformly
  for (const [origRate, indices] of rateIndices) {
    const candidates = generateCandidateRates(
      origRate,
      sourceRates,
      maxDeviation,
    );
    for (const candidate of candidates.slice(0, 30)) {
      const trial = [...targetRates];
      for (const idx of indices) {
        trial[idx] = candidate;
      }
      const allTrial = [...sourceRates, ...trial];
      const ratios = toIntegerRatios(allTrial);
      const total = ratios.reduce((a, b) => a + b, 0);
      if (total < bestTotal) {
        bestTotal = total;
        bestRates = trial;
      }
    }
  }

  // Also try combinations of unique rates when there are few unique groups
  if (uniqueRates.length <= 3) {
    const uniqueCandidates = uniqueRates.map(r =>
      generateCandidateRates(r, sourceRates, maxDeviation).slice(0, 20),
    );

    function searchUnique(idx: number, current: Map<number, number>): void {
      if (idx === uniqueRates.length) {
        const trial = targetRates.map(r => current.get(r) ?? r);
        const allTrial = [...sourceRates, ...trial];
        const ratios = toIntegerRatios(allTrial);
        const total = ratios.reduce((a, b) => a + b, 0);
        if (total < bestTotal) {
          bestTotal = total;
          bestRates = [...trial];
        }
        return;
      }
      for (const candidate of uniqueCandidates[idx]) {
        current.set(uniqueRates[idx], candidate);
        searchUnique(idx + 1, current);
      }
    }
    searchUnique(0, new Map());
  }

  if (!bestRates || bestTotal >= exactTotal) return null;

  // Build the approximation records
  const approximations: RateApproximation[] = [];
  for (let t = 0; t < targetRates.length; t++) {
    if (Math.abs(bestRates[t] - targetRates[t]) > 0.001) {
      approximations.push({
        targetIndex: t,
        requestedRate: targetRates[t],
        actualRate: bestRates[t],
        deviation: (bestRates[t] - targetRates[t]) / targetRates[t],
      });
    }
  }

  return approximations.length > 0
    ? { rates: bestRates, approximations }
    : null;
}

// ---------------------------------------------------------------------------
// Belt-capped splitter chain
// ---------------------------------------------------------------------------

/**
 * Check if a belt-capped splitter chain can handle this scenario.
 * In Satisfactory, connecting a splitter output to a lower-tier belt
 * causes backpressure that limits throughput to the belt's max speed.
 * A chain of splitters can sequentially tap off exact belt-speed amounts.
 *
 * Returns the graph if applicable, null otherwise.
 */
/**
 * Check that a tap output requires a strictly lower belt tier than the
 * input. Backpressure splitting only works when the output belt is
 * slower than the source belt feeding the splitter.
 */
function tapBeltIsLower(
  inputRate: number,
  tapRate: number,
  maxBeltSpeed: number,
): boolean {
  const inputBelt = getBeltForRate(inputRate, maxBeltSpeed);
  const tapBelt = getBeltForRate(tapRate, maxBeltSpeed);
  if (!inputBelt || !tapBelt) return false;
  return tapBelt.speed < inputBelt.speed;
}

function tryBeltCappedChain(
  sourceRates: number[],
  targetRates: number[],
  leftover: number,
  maxBeltSpeed: number,
): SplitterResult | null {
  const hasLeftover = leftover > 0.01;
  const realTargets = hasLeftover ? targetRates.slice(0, -1) : targetRates;

  const beltSpeeds = new Set(getBeltTiers(maxBeltSpeed).map(t => t.speed));
  const totalSource = sourceRates.reduce((a, b) => a + b, 0);

  // Total flow into the chain must not exceed max belt speed
  if (totalSource > maxBeltSpeed + 0.01) return null;

  // Standard chain: every real target matches a belt speed
  const allTargetsBeltSpeed =
    realTargets.length >= 2 &&
    realTargets.every(rate => beltSpeeds.has(Math.round(rate)));

  if (allTargetsBeltSpeed) {
    const sortedTargets = realTargets
      .map((rate, i) => ({ rate, originalIdx: i }))
      .sort((a, b) => b.rate - a.rate);

    // Verify feasibility: at each splitter the tap output must use a
    // strictly lower belt tier than the input for backpressure to work.
    // The final target that consumes all remaining flow is a direct
    // connection (no splitter), so it doesn't need the belt check.
    let remaining = totalSource;
    for (const t of sortedTargets) {
      if (t.rate > remaining + 0.01) return null;
      const passthrough = remaining - t.rate;
      const isDirectFinal = passthrough < 0.01 && !hasLeftover;
      if (!isDirectFinal && !tapBeltIsLower(remaining, t.rate, maxBeltSpeed))
        return null;
      remaining = passthrough;
    }

    return buildBeltCappedChainGraph(
      sourceRates,
      sortedTargets,
      leftover,
      maxBeltSpeed,
    );
  }

  // Inverse: leftover matches a belt speed. A splitter with belt-capped
  // outputs on both sides distributes flow via backpressure — the
  // leftover output gets a belt matching its rate, and the target
  // output gets a belt sized for the remainder.
  if (hasLeftover && beltSpeeds.has(Math.round(leftover))) {
    const remainderRate = totalSource - leftover;
    if (remainderRate > maxBeltSpeed + 0.01) return null;
    if (remainderRate < 0.01) return null;

    // Both output belts must be strictly slower than the input belt
    // since both outputs are terminal (no downstream chain to create
    // additional backpressure).
    if (
      !tapBeltIsLower(totalSource, leftover, maxBeltSpeed) ||
      !tapBeltIsLower(totalSource, remainderRate, maxBeltSpeed)
    )
      return null;

    const sourceNodes: ConveyorNode[] = sourceRates.map((rate, i) =>
      createNode('source', rate, `Source ${i + 1}`),
    );
    let chainInput: ConveyorNode;
    if (sourceNodes.length === 1) {
      chainInput = sourceNodes[0];
    } else {
      chainInput = mergeStreamNodes(sourceNodes);
    }

    const splitter = createNode('splitter', totalSource);
    link(chainInput, splitter, totalSource);

    // Leftover tap (belt-capped)
    const leftoverTarget = createNode(
      'target',
      leftover,
      `Leftover: ${leftover}/min`,
    );
    link(splitter, leftoverTarget, leftover);

    // Remainder to real target(s)
    let current: ConveyorNode = splitter;
    let currentRate = remainderRate;
    for (let i = 0; i < realTargets.length; i++) {
      const rate = realTargets[i];
      const isLast = i === realTargets.length - 1;
      if (isLast && Math.abs(currentRate - rate) < 0.01) {
        const target = createNode(
          'target',
          rate,
          `Target ${i + 1}: ${rate}/min`,
        );
        link(current, target, rate);
      } else {
        const nextSplitter = createNode('splitter', currentRate);
        link(current, nextSplitter, currentRate);
        const target = createNode(
          'target',
          rate,
          `Target ${i + 1}: ${rate}/min`,
        );
        link(nextSplitter, target, rate);
        currentRate -= rate;
        current = nextSplitter;
      }
    }

    const graph = collectGraph(sourceNodes);
    removePassthroughs(graph.nodes, graph.links);
    return graph;
  }

  return null;
}

function buildBeltCappedChainGraph(
  sourceRates: number[],
  sortedTargets: { rate: number; originalIdx: number }[],
  leftover: number,
  maxBeltSpeed: number,
): SplitterResult {
  const hasLeftover = leftover > 0.01;

  // Create source nodes and merge if multiple
  const sourceNodes: ConveyorNode[] = sourceRates.map((rate, i) =>
    createNode('source', rate, `Source ${i + 1}`),
  );
  let chainInput: ConveyorNode;
  if (sourceNodes.length === 1) {
    chainInput = sourceNodes[0];
  } else {
    chainInput = mergeStreamNodes(sourceNodes);
  }

  const totalSource = sourceRates.reduce((a, b) => a + b, 0);
  let currentInput = chainInput;
  let currentRate = totalSource;

  const targetNodes: ConveyorNode[] = [];

  for (let i = 0; i < sortedTargets.length; i++) {
    const { rate, originalIdx } = sortedTargets[i];
    const isLast = i === sortedTargets.length - 1 && !hasLeftover;

    if (isLast && Math.abs(currentRate - rate) < 0.01) {
      // Last target consumes all remaining flow — no splitter needed
      const target = createNode(
        'target',
        rate,
        `Target ${originalIdx + 1}: ${rate}/min`,
      );
      link(currentInput, target, rate);
      targetNodes.push(target);
    } else {
      const splitter = createNode('splitter', currentRate);
      link(currentInput, splitter, currentRate);

      // Tap output → target
      const target = createNode(
        'target',
        rate,
        `Target ${originalIdx + 1}: ${rate}/min`,
      );
      link(splitter, target, rate);
      targetNodes.push(target);

      // Passthrough to next stage
      currentRate -= rate;
      currentInput = splitter;
    }
  }

  // Handle leftover
  if (hasLeftover && currentRate > 0.01) {
    const leftoverTarget = createNode(
      'target',
      currentRate,
      `Leftover: ${currentRate}/min`,
    );
    link(currentInput, leftoverTarget, currentRate);
    targetNodes.push(leftoverTarget);
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
  // Try belt-capped chain — simplest when targets match belt speeds.
  // Models the real Satisfactory mechanic of backpressure-limited taps.
  const beltChain = tryBeltCappedChain(
    sourceRates,
    targetRates,
    leftover,
    maxBeltSpeed,
  );
  if (beltChain) return beltChain;

  // Try direct flow assignment — produces much simpler graphs
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

  // Check complexity of exact solution
  const allRates = [...sourceRates, ...targetRates];
  const intRatios = toIntegerRatios(allRates);
  const totalUnits = intRatios.reduce((a, b) => a + b, 0);

  // If exact solution is too complex, try approximate rates.
  // Only approximate the real targets, not the leftover target.
  if (totalUnits > MAX_COMPLEXITY_UNITS) {
    const hasLeftover = leftover > 0.01;
    const realTargets = hasLeftover ? targetRates.slice(0, -1) : targetRates;

    const approx = findApproximateRates(sourceRates, realTargets);
    if (approx) {
      const totalSource = sourceRates.reduce((a, b) => a + b, 0);
      const newTotalTarget = approx.rates.reduce((a, b) => a + b, 0);
      const newLeftover = totalSource - newTotalTarget;
      const adjustedTargets =
        newLeftover > 0.01 ? [...approx.rates, newLeftover] : [...approx.rates];

      // Try flow assignment with approximate rates first
      const approxAssignments = tryFlowAssignment(
        sourceRates,
        adjustedTargets,
        maxBeltSpeed,
      );
      if (approxAssignments) {
        const result = buildFlowAssignmentGraph(
          sourceRates,
          adjustedTargets,
          approxAssignments,
          newLeftover,
          maxBeltSpeed,
        );
        result.approximations = approx.approximations;
        return result;
      }

      // Fall through to unit-rate with approximate rates
      return buildUnitRateGraph(
        sourceRates,
        adjustedTargets,
        newLeftover,
        maxBeltSpeed,
        approx.approximations,
      );
    }
  }

  return buildUnitRateGraph(sourceRates, targetRates, leftover, maxBeltSpeed);
}

function buildUnitRateGraph(
  sourceRates: number[],
  targetRates: number[],
  leftover: number,
  maxBeltSpeed: number,
  approximations?: RateApproximation[],
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

  if (approximations) {
    graph.approximations = approximations;
  }

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
        splitIntoStreams(mergers[i], perGroup, ratePerStream, maxBeltSpeed),
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
// Smart splitter partitioning strategy
// ---------------------------------------------------------------------------

/**
 * Generate all 3-smooth numbers (products of 2s and 3s) up to `max`.
 * These are the only group sizes that split cleanly with standard
 * 2-way and 3-way splitters — no loop-backs or mergers needed.
 */
function smoothNumbersUpTo(max: number): number[] {
  const result: number[] = [];
  let pow3 = 1;
  while (pow3 <= max) {
    let val = pow3;
    while (val <= max) {
      result.push(val);
      val *= 2;
    }
    pow3 *= 3;
  }
  return result.sort((a, b) => a - b);
}

/**
 * Find the best partition of `total` into 2–3 groups of 3-smooth sizes.
 * Prefers partitions where the minimum group size is maximized (balanced),
 * avoiding degenerate size-1 groups. Falls back to fewest-groups if needed.
 *
 * Returns the list of group sizes, or null if no partition is possible
 * within `maxGroups` branches (smart splitter has max 3 outputs).
 */
function findFewestSmoothGroups(
  total: number,
  maxGroupSize: number,
  maxGroups: number,
): number[] | null {
  const smoothSizes = smoothNumbersUpTo(Math.min(total, maxGroupSize));
  if (smoothSizes.length === 0) return null;

  let best: number[] | null = null;
  let bestMinGroup = 0;

  // Try 2-way partitions: a + b = total
  for (const a of smoothSizes) {
    const b = total - a;
    if (b < 1 || b > maxGroupSize) continue;
    if (!isSmooth(b)) continue;
    const minGroup = Math.min(a, b);
    if (!best || minGroup > bestMinGroup) {
      best = [a, b];
      bestMinGroup = minGroup;
    }
  }

  // Try 3-way partitions: a + b + c = total
  if (maxGroups >= 3) {
    for (const a of smoothSizes) {
      for (const b of smoothSizes) {
        const c = total - a - b;
        if (c < 1 || c > maxGroupSize) continue;
        if (!isSmooth(c)) continue;
        const minGroup = Math.min(a, b, c);
        if (!best || minGroup > bestMinGroup) {
          best = [a, b, c];
          bestMinGroup = minGroup;
        }
      }
    }
  }

  if (!best) return null;
  return best.sort((a, b) => b - a);
}

interface SmartPartition {
  groupSizes: number[];
  targetRate: number;
}

/**
 * Try to partition same-rate targets into 3-smooth groups (max 3 branches)
 * so each branch of the smart splitter feeds a clean splitter tree.
 *
 * The smart splitter uses belt-capacity + overflow to produce asymmetric
 * flow: one output is connected to a belt tier that caps its throughput,
 * and the overflow output receives the remainder.
 */
function trySmartSplitterPartition(
  sourceRate: number,
  targetRates: number[],
  maxBeltSpeed: number,
): SmartPartition | null {
  if (targetRates.length < 2) return null;

  // All targets must share the same rate
  const targetRate = targetRates[0];
  if (!targetRates.every(r => Math.abs(r - targetRate) < 0.01)) return null;

  const totalCount = targetRates.length;
  if (Math.abs(targetRate * totalCount - sourceRate) > 0.01) return null;

  // If the count is already 3-smooth, no smart splitter needed
  if (isSmooth(totalCount)) return null;

  // Each branch's total rate must fit on a belt
  const maxPerBranch = Math.floor(maxBeltSpeed / targetRate);

  const groups = findFewestSmoothGroups(totalCount, maxPerBranch, 3);
  if (!groups) return null;

  // Verify each branch rate fits within belt capacity
  for (const g of groups) {
    if (g * targetRate > maxBeltSpeed + 0.01) return null;
  }

  return { groupSizes: groups, targetRate };
}

/**
 * Build a graph using a smart splitter at the root that distributes
 * flow to 2-3 branches using belt-capacity + overflow. Each branch
 * feeds a clean 3-smooth splitter tree.
 */
function buildSmartSplitterGraph(
  partition: SmartPartition,
  sourceRates: number[],
  targetRates: number[],
  leftover: number,
  maxBeltSpeed: number,
): SplitterResult {
  const hasLeftover = leftover > 0.01;
  const { groupSizes, targetRate } = partition;

  const source = createNode('source', sourceRates[0], 'Source 1');
  const smart = createNode('smart_splitter', sourceRates[0]);
  smart.label = 'Smart Splitter';
  link(source, smart, sourceRates[0]);

  let targetIdx = 0;

  for (const groupSize of groupSizes) {
    const branchRate = groupSize * targetRate;

    // Create a branch entry node with the correct holding rate.
    // The smart splitter feeds this branch at exactly branchRate,
    // and the splitter tree subdivides from there.
    const branchEntry = createNode('splitter', branchRate);
    link(smart, branchEntry, branchRate);

    let leaves: ConveyorNode[];
    if (groupSize === 1) {
      leaves = [branchEntry];
    } else {
      leaves = buildSplitTree(branchEntry, branchRate, groupSize, targetRate);
    }

    for (let i = 0; i < groupSize; i++) {
      const tIdx = targetIdx++;
      const isLeftoverTarget = hasLeftover && tIdx === targetRates.length - 1;
      const label = isLeftoverTarget
        ? `Leftover: ${targetRates[tIdx]}/min`
        : `Target ${tIdx + 1}: ${targetRates[tIdx]}/min`;
      const target = createNode('target', targetRates[tIdx], label);
      link(leaves[i], target, targetRates[tIdx]);
    }
  }

  // Handle any leftover targets not covered by the partition
  while (targetIdx < targetRates.length) {
    const tIdx = targetIdx++;
    const target = createNode(
      'target',
      targetRates[tIdx],
      `Leftover: ${targetRates[tIdx]}/min`,
    );
    link(smart, target, targetRates[tIdx]);
  }

  const graph = collectGraph([source]);
  removePassthroughs(graph.nodes, graph.links);
  return graph;
}

// ---------------------------------------------------------------------------
// Independent sub-problem decomposition
// ---------------------------------------------------------------------------

/**
 * Try to partition sources and targets into independent groups where
 * each group can be solved separately. A group is independent when one
 * or more sources exactly cover a subset of targets with no leftover
 * (or all leftover concentrated in one group).
 *
 * For example: 1×1200 + 1×600 → 10×120 + 10×60
 *   Group A: 1200 → 10×120 (exact match)
 *   Group B: 600 → 10×60  (exact match)
 * Each group can then use its own optimal strategy (smart splitter, etc.)
 */
function tryIndependentSubproblems(
  sourceRates: number[],
  targetRates: number[],
  leftover: number,
  request: SplitterRequest,
): SplitterResult | null {
  const hasLeftover = leftover > 0.01;
  const realTargets = hasLeftover ? targetRates.slice(0, -1) : targetRates;

  // Group identical targets by rate
  const targetsByRate = new Map<number, number[]>();
  for (let i = 0; i < realTargets.length; i++) {
    const rate = Math.round(realTargets[i] * 100) / 100;
    if (!targetsByRate.has(rate)) targetsByRate.set(rate, []);
    targetsByRate.get(rate)!.push(i);
  }

  // Try to match each source (or group of same-rate sources) to a
  // group of same-rate targets where the totals match exactly.
  const usedSources = new Set<number>();
  const usedTargetGroups = new Set<number>();
  const groups: {
    sourceIndices: number[];
    targetRate: number;
    targetCount: number;
  }[] = [];

  // Sort target rates descending so we match large groups first
  const uniqueTargetRates = [...targetsByRate.keys()].sort((a, b) => b - a);

  for (const targetRate of uniqueTargetRates) {
    const targetIndices = targetsByRate.get(targetRate)!;
    const totalTargetNeed = targetRate * targetIndices.length;

    // Find a set of unused sources whose total exactly matches
    const availableSources = sourceRates
      .map((r, i) => ({ rate: r, idx: i }))
      .filter(s => !usedSources.has(s.idx));

    // Try single source match first
    let matched = false;
    for (const s of availableSources) {
      if (Math.abs(s.rate - totalTargetNeed) < 0.01) {
        groups.push({
          sourceIndices: [s.idx],
          targetRate,
          targetCount: targetIndices.length,
        });
        usedSources.add(s.idx);
        usedTargetGroups.add(targetRate);
        matched = true;
        break;
      }
    }

    // Try multi-source match (2-3 sources summing to target need)
    if (!matched) {
      for (let i = 0; i < availableSources.length && !matched; i++) {
        for (let j = i + 1; j < availableSources.length && !matched; j++) {
          const sum2 = availableSources[i].rate + availableSources[j].rate;
          if (Math.abs(sum2 - totalTargetNeed) < 0.01) {
            groups.push({
              sourceIndices: [availableSources[i].idx, availableSources[j].idx],
              targetRate,
              targetCount: targetIndices.length,
            });
            usedSources.add(availableSources[i].idx);
            usedSources.add(availableSources[j].idx);
            usedTargetGroups.add(targetRate);
            matched = true;
          }
        }
      }
    }
  }

  // Need at least 2 independent groups for this to be useful
  if (groups.length < 2) return null;

  // All sources must be accounted for
  if (usedSources.size !== sourceRates.length) return null;

  // All real targets must be accounted for
  const coveredTargets = groups.reduce((sum, g) => sum + g.targetCount, 0);
  if (coveredTargets !== realTargets.length) return null;

  // Solve each group independently
  const subResults: SplitterResult[] = [];

  for (const group of groups) {
    const subSources = group.sourceIndices.map(i => ({
      rate: sourceRates[i],
      count: 1,
    }));
    const subTargets = [{ rate: group.targetRate, count: group.targetCount }];

    const subResult = calculateSplitterNetwork({
      sources: subSources,
      targets: subTargets,
      maxBeltSpeed: request.maxBeltSpeed,
      allowSmartSplitters: request.allowSmartSplitters,
    });

    if (subResult.error) return null;
    subResults.push(subResult);
  }

  // Merge all sub-results into one graph
  const allNodes: ConveyorNode[] = [];
  const allLinks: ConveyorLink[] = [];
  for (const sub of subResults) {
    allNodes.push(...sub.nodes);
    allLinks.push(...sub.links);
  }

  // Renumber source and target labels globally
  let sourceIdx = 1;
  let targetIdx = 1;
  for (const node of allNodes) {
    if (node.type === 'source') {
      node.label = `Source ${sourceIdx++}`;
    } else if (node.type === 'target' && !node.label?.startsWith('Leftover')) {
      node.label = `Target ${targetIdx++}: ${node.holding}/min`;
    }
  }

  return {
    nodes: allNodes,
    links: allLinks,
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function calculateSplitterNetwork(
  request: SplitterRequest,
): SplitterResult {
  const isTopLevel = solveDepth === 0;
  if (isTopLevel) nodeIdCounter = 0;
  solveDepth++;

  try {
    return solveNetwork(request);
  } finally {
    solveDepth--;
  }
}

function solveNetwork(request: SplitterRequest): SplitterResult {
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

  // Try smart splitter partitioning when allowed and single-source.
  // Uses belt-capacity + overflow to produce asymmetric branches where
  // each branch feeds a clean 3-smooth splitter tree.
  if (request.allowSmartSplitters && sourceRates.length === 1) {
    const partition = trySmartSplitterPartition(
      sourceRates[0],
      targetRates,
      request.maxBeltSpeed,
    );
    if (partition) {
      return buildSmartSplitterGraph(
        partition,
        sourceRates,
        targetRates,
        leftover,
        request.maxBeltSpeed,
      );
    }
  }

  // Try to decompose into independent sub-problems. When multiple
  // sources each independently serve a disjoint group of targets
  // (e.g., 1200→10×120 and 600→10×60), solve each group separately
  // so each can use the optimal strategy (smart splitter, belt-capped
  // chain, etc.) instead of falling into the generic flow assignment.
  if (sourceRates.length >= 2) {
    const subResult = tryIndependentSubproblems(
      sourceRates,
      targetRates,
      leftover,
      request,
    );
    if (subResult) return subResult;
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
