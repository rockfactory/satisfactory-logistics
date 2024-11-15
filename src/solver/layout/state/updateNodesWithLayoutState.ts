import type { SolutionNode } from '@/solver/algorithm/solveProduction';
import type { SolverLayoutState } from '@/solver/store/Solver';

export function updateNodesWithLayoutState(
  nodes: SolutionNode[],
  layout: SolverLayoutState | null | undefined,
) {
  if (!layout) {
    return nodes;
  }

  return nodes.map(node => {
    const layoutNode = layout[node.id];
    if (!layoutNode) {
      return node;
    }
    return {
      ...node,
      position: layoutNode,
    };
  });
}
