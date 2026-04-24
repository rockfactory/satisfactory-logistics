import { type Path, setByPath } from '@clickbar/dot-diver';
import { useEffect, useMemo } from 'react';
import { useFormOnChange } from '@/core/form/useFormOnChange';
import { loglev } from '@/core/logger/log';
import { useStore } from '@/core/zustand';
import {
  useFactoryInputsOutputs,
  useFactoryOutputConsumers,
} from '@/factories/store/factoriesSelectors';
import { useShowOutputFactoriesNodes } from '@/games/gamesSlice';
import { isByproductNode } from '@/solver/algorithm/getSolutionNodes';
import { isSolutionFound } from '@/solver/algorithm/solve/isSolutionFound';
import { solveProduction, useHighs } from '@/solver/algorithm/solveProduction';
import {
  type ISolverSolutionSuggestion,
  proposeSolverSolutionSuggestions,
} from '@/solver/page/suggestions/proposeSolverSolutionSuggestions';
import type { SolverInstance } from '@/solver/store/Solver';
import {
  useCurrentSolverId,
  usePathSolverInstance,
  useSolverGameId,
} from '@/solver/store/solverSelectors';

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

/**
 * Writes solver-computed amounts directly to factory output `amount` for
 * outputs with objective === 'max'. This keeps `amount` as the single
 * source of truth, so all code reading it gets the correct value.
 *
 * Safe from infinite loops because:
 *  - The solver constraint for 'max' outputs is always `>= 0` (ignores amount)
 *  - The equality guard (amount === node.data.value) stops redundant updates
 */
function syncMaximizedOutputsToFactory(
  factoryId: string,
  solution: NonNullable<ReturnType<typeof solveProduction>>,
) {
  const outputs = useStore.getState().factories.factories[factoryId]?.outputs;
  if (!outputs) return;

  const maximizedNodes = solution.nodes
    .filter(isByproductNode)
    .filter(
      n => n.data.output?.objective === 'max' && n.data.outputIndex != null,
    );

  for (const node of maximizedNodes) {
    const outputIndex = node.data.outputIndex;
    if (outputIndex == null) continue;
    if (outputs[outputIndex]?.amount === node.data.value) continue;
    logger.debug(`maximized output ${node.data.resource} = ${node.data.value}`);
    useStore.getState().updateFactoryOutput(factoryId, outputIndex, {
      amount: node.data.value,
    });
  }
}

/**
 * Core hook that runs the LP solver and returns the solution.
 *
 * Flow:
 *  1. Ensures a solver instance + factory exist (creates defaults if missing)
 *  2. Runs solveProduction via HIGHS whenever request/inputs/outputs change
 *  3. If no valid solution, computes user-facing suggestions
 *  4. Syncs maximized output values back to the factory store
 */
export const useSolverSolution = (id: string, mode: 'game' | 'standalone') => {
  const { highsRef, loading } = useHighs();
  const currentSolverId = useCurrentSolverId();
  const inputsOutputs = useFactoryInputsOutputs(id);
  const outputConsumers = useFactoryOutputConsumers(id);
  const instance = usePathSolverInstance(id);
  const solverGameId = useSolverGameId(id);
  const showOutputFactoriesNodes = useShowOutputFactoriesNodes();

  // 1. Initialize solver instance and factory defaults if missing
  useEffect(() => {
    if (instance) return;
    logger.info('No instance or factory, creating', id);
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

  // 2. Run LP solver and compute suggestions
  const { solution, suggestions } = useMemo(() => {
    let suggestions: ISolverSolutionSuggestion = {};
    if (!instance?.request || !highsRef.current || loading) {
      return { solution: null, suggestions };
    }

    const solution = solveProduction(highsRef.current, {
      ...instance.request,
      ...inputsOutputs,
      outputConsumers,
      showOutputFactoriesNodes,
      nodes: instance.nodes,
    });
    logger.log('Solved ->', solution);

    // When the solver fails, suggest what the user can change
    if (solution && !isSolutionFound(solution)) {
      suggestions = proposeSolverSolutionSuggestions(
        highsRef.current,
        instance.request,
        inputsOutputs,
      );
    }

    logger.log('hasSolution =', isSolutionFound(solution));
    return { solution, suggestions };
    // Re-run only when the request shape changes, not on every instance mutation
  }, [
    highsRef,
    instance?.request,
    instance?.nodes,
    inputsOutputs,
    outputConsumers,
    showOutputFactoriesNodes,
    loading,
  ]);

  // 3. Sync maximized output values back to the factory
  // useEffect is necessary here: this is a side effect (store mutation)
  // triggered by derived data. Doing it imperatively in useMemo would
  // mutate the store during render, risking React warnings and re-entrancy.
  useEffect(() => {
    if (!id || !solution || !isSolutionFound(solution)) return;
    syncMaximizedOutputsToFactory(id, solution);
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
