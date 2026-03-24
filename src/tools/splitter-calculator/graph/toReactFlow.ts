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

  const edges: Edge[] = result.links.map((l, i) => {
    const belt = getBeltForRate(l.carrying, maxBeltSpeed);
    return {
      id: `edge-${i}`,
      source: l.from.id,
      target: l.to.id,
      type: 'belt',
      data: {
        carrying: l.carrying,
        beltName: belt?.name,
        beltSpeed: belt?.speed,
      },
    };
  });

  return { nodes, edges };
}
