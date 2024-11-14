import type { SolutionNode } from '@/solver/algorithm/solveProduction';
import type { SolverLayoutState } from '@/solver/store/Solver';
import { useMemo, useRef } from 'react';
import { isSavedLayoutValid } from './savedSolverLayoutUtils';

export function usePreviousSolverLayoutStates() {
  const previousLayouts = useRef<Map<string, SolverLayoutState>>(new Map());

  const helpers = useMemo(() => {
    const getPreviousLayouts = () => {
      return previousLayouts.current;
    };

    const getCompatiblePreviousLayout = (nodes: SolutionNode[]) => {
      for (const layout of previousLayouts.current.values()) {
        if (isSavedLayoutValid(nodes, layout)) {
          return layout;
        }
      }
    };

    const cachePreviousLayout = (layout: SolverLayoutState) => {
      previousLayouts.current.set(hashLayout(layout), layout);
    };

    return {
      getPreviousLayouts,
      getCompatiblePreviousLayout,
      cachePreviousLayout,
    };
  }, []);

  return helpers;
}

const hashLayout = (layout: SolverLayoutState) => {
  return Object.keys(layout).sort().join(',');
};
