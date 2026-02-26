import {
  solveProduction,
  useHighs,
} from '@/solver/algorithm/solveProduction';
import {
  useFactoryInputsOutputs,
} from '@/factories/store/factoriesSelectors';
import {
  useCurrentSolverId,
  usePathSolverInstance,
  useSolverGameId,
} from '@/solver/store/solverSelectors';
import { useEffect, useMemo } from 'react';
import { useStore } from '@/core/zustand';
import { Path, setByPath } from '@clickbar/dot-diver';
import { SolverInstance } from '@/solver/store/Solver';
import { useFormOnChange } from '@/core/form/useFormOnChange';
import {
  ISolverSolutionSuggestion,
  proposeSolverSolutionSuggestions,
} from '@/solver/page/suggestions/proposeSolverSolutionSuggestions';
import { isSolutionFound } from '@/solver/algorithm/solve/isSolutionFound';
import { isByproductNode } from '@/solver/algorithm/getSolutionNodes';
import { loglev } from '@/core/logger/log';

const logger = loglev.getLogger('solver:page');

const DEFAULT_FACTORY = {
  inputs: [],
  outputs: [
    {
      resource: 'Desc_Cement_C',
      amount: 20,
    },
  ],
};
export const useSolverSolution = (id: string, mode: 'game' | 'standalone') => {
  const { highsRef, loading } = useHighs();

  const currentSolverId = useCurrentSolverId();
  const inputsOutputs = useFactoryInputsOutputs(id);
  const instance = usePathSolverInstance(id);
  // This is not the _displayed_ solver ID, but the one that is to be used if no solver ID is provided
  const solverGameId = useSolverGameId(id);

  useEffect(() => {
    if (instance) return;

    logger.info('SolverPage: No instance or factory, creating', id);

    useStore.getState().upsertFactorySolver(id, DEFAULT_FACTORY);

    if (mode === 'standalone') {
      useStore.getState().updateFactory(id, old => {
        Object.assign(old, DEFAULT_FACTORY);
      });
    }
  }, [instance, mode, id]);

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

  useEffect(() => {
    if (!id || !solution || !isSolutionFound(solution)) return;
    const outputs = useStore.getState().factories.factories[id]?.outputs;
    if (!outputs) return;
    const maximizedNodes = solution.nodes
      .filter(isByproductNode)
      .filter(
        n => n.data.output?.objective === 'max' && n.data.outputIndex != null,
      );
    for (const node of maximizedNodes) {
      const outputIndex = node.data.outputIndex;
      if (outputIndex == null) continue;
      if (outputs[outputIndex]?.computedAmount === node.data.value) continue;
      useStore.getState().updateFactoryOutput(id, outputIndex, {
        computedAmount: node.data.value,
      });
    }
  }, [id, solution]);

  return {
    loading,
    currentSolverId,
    solverGameId,
    onChangeHandler,
    solution,
    suggestions,
    instance,
  };
};
