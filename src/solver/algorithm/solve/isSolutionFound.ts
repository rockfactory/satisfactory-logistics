import { ISolverSolution } from '@/solver/page/ISolverSolution.ts';

export function isSolutionFound(
  solution: ISolverSolution | null,
): solution is ISolverSolution {
  return solution?.result.Status === 'Optimal' && solution.nodes.length > 0;
}
