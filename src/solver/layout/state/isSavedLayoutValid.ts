import type { SolutionNode } from '@/solver/algorithm/solveProduction';
import type { SolverLayoutState } from '@/solver/store/Solver';
import { xor } from 'lodash';

export function isSavedLayoutValid(
  nodes: SolutionNode[],
  savedLayout: SolverLayoutState | null | undefined,
): savedLayout is SolverLayoutState {
  return (
    savedLayout != null &&
    xor(
      nodes.map(node => node.id),
      Object.keys(savedLayout),
    ).length === 0
  );
}

export function areSavedLayoutsCompatible(
  previousLayout: SolverLayoutState | null | undefined,
  savedLayout: SolverLayoutState | null | undefined,
): boolean {
  return (
    savedLayout != null &&
    previousLayout != null &&
    xor(Object.keys(previousLayout), Object.keys(savedLayout)).length === 0
  );
}
