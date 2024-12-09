import type { ISolverSolution } from '@/solver/page/SolverPage';
import { useMemo, type PropsWithChildren, createContext, useContext } from 'react';

export interface SolverSolutionContextValue {
  solution: ISolverSolution;
}

export const SolverSolutionContext =
  createContext<SolverSolutionContextValue | null>(null);

export const SolverSolutionProvider: React.FC<
  PropsWithChildren<SolverSolutionContextValue>
> = ({ solution, children }) => {
  const value = useMemo(() => ({ solution }), [solution]);
  return (
    <SolverSolutionContext.Provider value={value}>
      {children}
    </SolverSolutionContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useSolverSolution() {
  const context = useContext(SolverSolutionContext);
  if (!context) {
    throw new Error(
      'useSolverSolution must be used within a SolverSolutionProvider',
    );
  }
  return context;
}
