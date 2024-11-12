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

export function areSolverLayoutsEqual(
  layout1: SolverLayoutState | null | undefined,
  layout2: SolverLayoutState | null | undefined,
): boolean {
  return (
    layout1 != null &&
    layout2 != null &&
    xor(Object.keys(layout1), Object.keys(layout2)).length === 0 &&
    Object.keys(layout1).every(
      key =>
        layout1[key].x === layout2[key].x && layout1[key].y === layout2[key].y,
    )
  );
}

export function isFirstLayoutInProgress(nodes: SolutionNode[]) {
  return (
    layout != null &&
    xor(
      nodes.map(node => node.id),
      Object.keys(layout),
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

export function computeSolverLayout(nodes: SolutionNode[]) {
  return Object.fromEntries(
    nodes.map(node => [node.id, { x: node.position.x, y: node.position.y }]),
  );
}
