import type { ISolverSolution } from '@/solver/page/SolverPage';

export function isSolutionFound(
  solution: ISolverSolution | null,
): solution is ISolverSolution {
  return solution?.result.Status === 'Optimal' && solution.nodes.length > 0;
}
