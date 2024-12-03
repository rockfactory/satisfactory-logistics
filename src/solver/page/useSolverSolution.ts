import {
  solveProduction,
  useHighs,
} from '@/solver/algorithm/solveProduction.tsx';
import {
  useFactoryInputsOutputs,
  useFactorySimpleAttributes,
} from '@/factories/store/factoriesSelectors.ts';
import {
  useCurrentSolverId,
  usePathSolverInstance,
  useSolverGameId,
} from '@/solver/store/solverSelectors.ts';
import { useEffect, useMemo } from 'react';
import { useStore } from '@/core/zustand.ts';
import { Path, setByPath } from '@clickbar/dot-diver';
import { SolverInstance } from '@/solver/store/Solver.ts';
import { useFormOnChange } from '@/core/form/useFormOnChange.ts';
import {
  ISolverSolutionSuggestion,
  proposeSolverSolutionSuggestions,
} from '@/solver/page/suggestions/proposeSolverSolutionSuggestions.ts';
import { isSolutionFound } from '@/solver/algorithm/solve/isSolutionFound.ts';
import { loglev } from '@/core/logger/log.ts';
const logger = loglev.getLogger('solver:page');

export const useSolverSolution = (
  id: string | undefined,
) => {
  const { highsRef, loading } = useHighs();

  const factory = useFactorySimpleAttributes(id);
  const inputsOutputs = useFactoryInputsOutputs(id);
  const instance = usePathSolverInstance();
  // This is not the _displayed_ solver ID, but the one that is to be used if no solver ID is provided
  const currentSolverId = useCurrentSolverId();
  const solverGameId = useSolverGameId(id);

  useEffect(() => {
    if (instance && factory?.id) return;

    logger.info('SolverPage: No instance or factory, creating', id);
    useStore.getState().upsertFactorySolver(id, {
      inputs: [],
      outputs: [
        {
          resource: 'Desc_Cement_C',
          amount: 20,
        },
      ],
    });
  }, [instance, factory, id]);

  const updater = useMemo(
    () => (path: Path<SolverInstance>, value: string | null | number) => {
      useStore.getState().updateSolver(id!, state => {
        setByPath(state, path, value);
      });
    },
    [id],
  );

  const onChangeHandler = useFormOnChange<SolverInstance>(updater);

  /**
   * This is the main entry point for the solver algorithm.
   * It will compute the solution and suggestions based on the current
   * instance and inputs/outputs.
   */
  const { solution, suggestions } = useMemo(() => {
    let suggestions: ISolverSolutionSuggestion = {};
    if (!instance?.request || !highsRef.current || loading) {
      return {
        solution: null,
        suggestions,
      };
    }

    const solution = solveProduction(highsRef.current, {
      ...instance?.request,
      ...inputsOutputs,
      nodes: instance.nodes,
    });
    logger.log(`Solved -> `, solution);

    if (solution && !isSolutionFound(solution)) {
      suggestions = proposeSolverSolutionSuggestions(
        highsRef.current,
        instance.request,
        inputsOutputs,
      );
    }

    logger.log('hasSolution =', isSolutionFound(solution));

    return { solution, suggestions };
    // We don't want to re-run computation if instance changes, only if its request changes
  }, [highsRef, instance?.request, instance?.nodes, inputsOutputs, loading]);

  return {
    loading,
    factory,
    currentSolverId,
    solverGameId,
    onChangeHandler,
    solution,
    suggestions,
    instance
  };
};