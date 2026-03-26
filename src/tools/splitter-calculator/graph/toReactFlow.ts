import type { Edge, Node } from '@xyflow/react';
import { getBeltForRate } from '../algorithm/splitRatios';
import type { SplitterResult } from '../algorithm/types';

export function toReactFlowGraph(
  result: SplitterResult,
  maxBeltSpeed: number,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = result.nodes.map(n => ({
    id: n.id,
    type: n.type,
    position: { x: 0, y: 0 },
    data: {
      holding: n.holding,
      rate: n.holding,
      label: n.label,
      smartRule: n.smartRule,
      outputCount: n.children.length,
      inputCount: n.parents.length,
    },
  }));

  // Merge parallel edges (same source→target) into a single edge
  // with combined rate. The algorithm keeps them separate to preserve
  // splitter output count, but for display we combine them so the
  // label shows the total flow (e.g., 2×240 = 480 instead of two
  // overlapping 240 edges).
  const edgeMap = new Map<string, { source: string; target: string; carrying: number }>();
  for (const l of result.links) {
    const key = `${l.from.id}→${l.to.id}`;
    const existing = edgeMap.get(key);
    if (existing) {
      existing.carrying += l.carrying;
    } else {
      edgeMap.set(key, { source: l.from.id, target: l.to.id, carrying: l.carrying });
    }
  }

  const edgeList = [...edgeMap.values()];

  // Count sibling edges per source and per target for offset calculations
  const sourceCount = new Map<string, number>();
  const targetCount = new Map<string, number>();
  for (const e of edgeList) {
    sourceCount.set(e.source, (sourceCount.get(e.source) ?? 0) + 1);
    targetCount.set(e.target, (targetCount.get(e.target) ?? 0) + 1);
  }

  const sourceIdx = new Map<string, number>();
  const targetIdx = new Map<string, number>();
  const edges: Edge[] = [];
  for (let i = 0; i < edgeList.length; i++) {
    const e = edgeList[i];
    const belt = getBeltForRate(e.carrying, maxBeltSpeed);
    const si = sourceIdx.get(e.source) ?? 0;
    const ti = targetIdx.get(e.target) ?? 0;
    sourceIdx.set(e.source, si + 1);
    targetIdx.set(e.target, ti + 1);
    edges.push({
      id: `edge-${i}`,
      source: e.source,
      target: e.target,
      type: 'belt',
      data: {
        carrying: e.carrying,
        beltName: belt?.name,
        beltSpeed: belt?.speed,
        sourceEdgeIndex: si,
        sourceEdgeCount: sourceCount.get(e.source) ?? 1,
        targetEdgeIndex: ti,
        targetEdgeCount: targetCount.get(e.target) ?? 1,
      },
    });
  }

  return { nodes, edges };
}
