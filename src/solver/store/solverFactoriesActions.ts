import { loglev } from '@/core/logger/log';
import { createActions } from '@/core/zustand-helpers/actions';
import { Factory, FactoryOutput, type FactoryInput } from '@/factories/Factory';
import { bfsFromNode } from 'graphology-traversal';
import { v4 } from 'uuid';
import { SolverRequest, type SolverInstance } from './Solver';
import { computeAutoSetInputs } from './auto-set/computeAutoSetInputs';
import { ISolverSolution } from '@/solver/page/ISolverSolution';

const logger = loglev.getLogger('store:solver-factories');

export const solverFactoriesActions = createActions({
  /**
   * Prepares a solver-factory
   */
  upsertFactorySolver:
    (factoryId: string | undefined, factory?: Partial<Factory>) =>
    (state, get) => {
      if (!factoryId) factoryId = v4();
      if (
        !state.factories.factories[factoryId] ||
        // Fix for currently saved factories without an ID
        state.factories.factories[factoryId].id !== factoryId
      ) {
        logger.info('Creating factory', factoryId);
        get().createFactory(factoryId, factory);

        // If we are creating a new solver without a factory,
        // we still don't link the factory to the game.
        // The player can do this manually later.
        // get().addFactoryIdToGame(undefined, factoryId);
      }

      if (!state.solvers.instances[factoryId]) {
        logger.info('Creating solver', factoryId);
        const gameAllowedRecipes =
          state.games.games[state.games.selected ?? '']?.allowedRecipes;
        get().createSolver(factoryId, { allowedRecipes: gameAllowedRecipes });
      }
    },
  createFactoryWithSolver:
    (gameId: string | null, factory?: Partial<Factory>) => (state, get) => {
      const factoryId = factory?.id ?? v4();
      const targetId = gameId ?? state.games.selected;
      if (!targetId) {
        throw new Error('No game selected');
      }

      get().createFactory(factoryId, factory);
      get().addFactoryIdToGame(targetId, factoryId);

      const gameAllowedRecipes = state.games.games[targetId]?.allowedRecipes;
      get().createSolver(factoryId, { allowedRecipes: gameAllowedRecipes });
    },
  // Input/Output should be synced
  addFactoryInput:
    (
      factoryId: string,
      input?: {
        resource: string | null;
        amount: number | null;
      },
    ) =>
    state => {
      if (!state.factories.factories[factoryId]?.inputs)
        state.factories.factories[factoryId].inputs = [];

      state.factories.factories[factoryId]?.inputs?.push({
        resource: input?.resource ?? null,
        amount: input?.amount ?? 0,
      });
    },
  removeFactoryInput: (factoryId: string, inputIndex: number) => state => {
    state.factories.factories[factoryId]?.inputs?.splice(inputIndex, 1);
    // state.solvers.instances[factoryId]?.request.inputs?.splice(inputIndex, 1);
  },
  updateFactoryInput:
    (
      factoryId: string,
      inputIndex: number,
      input: Pick<FactoryInput, 'constraint'>,
    ) =>
    state => {
      const factoryInput =
        state.factories.factories[factoryId]?.inputs?.[inputIndex];
      if (!factoryInput) {
        console.error('Factory input not found', factoryId, inputIndex);
      }

      if (input.constraint) {
        factoryInput.constraint = input.constraint;
      }
    },

  addFactoryOutput: (factoryId: string) => state => {
    state.factories.factories[factoryId]?.outputs?.push({
      resource: null,
      amount: 0,
    });
    // state.solvers.instances[factoryId]?.request.outputs.push({
    //   resource: null,
    //   amount: 0,
    // });
  },
  removeFactoryOutput: (factoryId: string, outputIndex: number) => state => {
    state.factories.factories[factoryId]?.outputs?.splice(outputIndex, 1);
    // state.solvers.instances[factoryId]?.request.outputs.splice(outputIndex, 1);
  },
  updateFactoryAndSolverRequest:
    (factoryId: string, fn: (item: Factory | SolverRequest) => void) =>
    state => {
      if (state.factories.factories[factoryId]) {
        fn(state.factories.factories[factoryId]);
      }
      // if (state.solvers.instances[factoryId]?.request) {
      //   fn(state.solvers.instances[factoryId]?.request);
      // }
    },
  updateFactoryOutput:
    (factoryId: string, outputIndex: number, output: Partial<FactoryOutput>) =>
    state => {
      const factoryOutput =
        state.factories.factories[factoryId]?.outputs![outputIndex];

      if (output.resource) {
        factoryOutput.resource = output.resource;
      }

      if (output.amount !== undefined) {
        factoryOutput.amount = output.amount;
      }

      if (output.somersloops !== undefined) {
        factoryOutput.somersloops = output.somersloops;
      }

      if (output.objective !== undefined) {
        factoryOutput.objective = output.objective;
      }
    },
  /**
   * Automatically set the inputs from the solver solution.
   */
  autoSetInputsFromSolver:
    (factoryId: string, solution: ISolverSolution) => state => {
      const factory = state.factories.factories[factoryId];
      if (!factory) return;
      if (!factory.inputs) factory.inputs = [];

      factory.inputs = computeAutoSetInputs(solution, factory);
    },
  /**
   * Update the solver instance with the new somersloops value.
   * Doing this will also update the somersloops for all outputs,
   * recomputing the total somersloops.
   */
  updateSolverSomersloops:
    (
      graph: ISolverSolution['graph'],
      factoryId: string,
      // nodeId is variable name
      nodeId: string,
      somersloops: number,
    ) =>
    state => {
      // 1. Update the solver instance with the new somersloops value
      const solvers = state.solvers.instances;
      if (!solvers[factoryId]) return;
      if (!solvers[factoryId].nodes) solvers[factoryId].nodes = {};
      if (!solvers[factoryId].nodes[nodeId])
        solvers[factoryId].nodes[nodeId] = {};

      solvers[factoryId].nodes[nodeId].somersloops = somersloops;

      // 2. Recompute somersloops for all outputs
      const somersloopNodes = Object.entries(solvers[factoryId].nodes).filter(
        ([_id, nodeState]) =>
          nodeState.somersloops && nodeState.somersloops > 0,
      );

      state.factories.factories[factoryId]?.outputs?.forEach(output => {
        output.somersloops = 0;
      });

      for (const [somersloopNodeId, somersloopNodeState] of somersloopNodes) {
        if (!graph.hasNode(somersloopNodeId)) {
          logger.error('Node not found in graph', somersloopNodeId);
          delete solvers[factoryId].nodes[somersloopNodeId];
          continue;
        }

        let isOutputUpdated = false;

        bfsFromNode(
          graph,
          somersloopNodeId,
          (id, attrs) => {
            // We store the somersloops amount only on the _first_ output node,
            // to avoid displaying the same value multiple times.
            if (isOutputUpdated) return true;

            if (attrs.type !== 'byproduct') return;
            const output = state.factories.factories[factoryId]?.outputs?.find(
              o => o.resource === attrs.resource.id,
            );
            if (output) {
              logger.info('Adding somersloops', somersloopNodeState.somersloops, 'to output', output.resource, 'from node', somersloopNodeId); // prettier-ignore
              output.somersloops =
                (output.somersloops ?? 0) +
                (somersloopNodeState.somersloops ?? 0);

              isOutputUpdated = true;
            }
          },
          { mode: 'outbound' },
        );
      }
    },
  resetSolverBuiltMarkers: (factoryId: string) => state => {
    const solver = state.solvers.instances[factoryId];
    if (!solver) return;

    for (const nodeId in solver.nodes) {
      delete solver.nodes[nodeId].done;
    }
  },
  loadSharedSolver:
    (
      instance: SolverInstance,
      factory: Factory,
      data: {
        isOwner: boolean;
        localId: string;
        sharedId: string;
      },
    ) =>
    state => {
      const { isOwner, localId } = data;
      state.solvers.instances[localId] = instance;
      instance.id = localId;
      state.factories.factories[localId] = factory;
      factory.id = localId;
      if (!isOwner) {
        state.solvers.instances[localId].sharedId = undefined; // We need to unlink the shared instance
        state.solvers.instances[localId].isOwner = false;
        state.solvers.instances[localId].isFactory = false;
        state.solvers.instances[localId].remoteSharedId = data.sharedId;
      }
    },
});
