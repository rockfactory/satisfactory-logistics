import React, { useMemo, type PropsWithChildren } from 'react';
import { ISolverSolution } from '@/solver/page/ISolverSolution.ts';

export interface SolverSolutionContextValue {
  solution: ISolverSolution;
}

export const SolverSolutionContext =
  React.createContext<SolverSolutionContextValue | null>(null);

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
  const context = React.useContext(SolverSolutionContext);
  if (!context) {
    throw new Error(
      'useSolverSolution must be used within a SolverSolutionProvider',
    );
  }
  return context;
}
