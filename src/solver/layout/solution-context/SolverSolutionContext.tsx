import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
} from 'react';
import type { ISolverSolution } from '@/solver/page/ISolverSolution';

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

export function useSolverSolution() {
  const context = useContext(SolverSolutionContext);
  if (!context) {
    throw new Error(
      'useSolverSolution must be used within a SolverSolutionProvider',
    );
  }
  return context;
}
