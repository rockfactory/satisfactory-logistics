import { bfsFromNode } from 'graphology-traversal';
import { v4 } from 'uuid';
import { loglev } from '@/core/logger/log';
import { createActions } from '@/core/zustand-helpers/actions';
import type { Factory, FactoryInput, FactoryOutput } from '@/factories/Factory';
import type { ISolverSolution } from '@/solver/page/ISolverSolution';
import { computeAutoSetInputs } from './auto-set/computeAutoSetInputs';
import type { SolverInstance, SolverRequest } from './Solver';

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
        const factory = state.factories.factories[factoryId];
        const gameAllowedBuildings =
          state.games.games[state.games.selected ?? '']?.allowedBuildings;
        // Use factory-specific buildings if set, otherwise use game-level
        const allowedBuildings =
          factory?.allowedBuildings ?? gameAllowedBuildings;
        get().createSolver(factoryId, {
          allowedRecipes: gameAllowedRecipes,
          allowedBuildings: allowedBuildings,
        });
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
      const gameAllowedBuildings =
        state.games.games[targetId]?.allowedBuildings;
      // Use factory-specific buildings if set, otherwise use game-level
      const allowedBuildings =
        factory?.allowedBuildings ?? gameAllowedBuildings;
      get().createSolver(factoryId, {
        allowedRecipes: gameAllowedRecipes,
        allowedBuildings: allowedBuildings,
      });
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
      const factory = state.factories.factories[factoryId];
      if (!factory) return;
      if (!factory.inputs) factory.inputs = [];

      factory.inputs.push({
        resource: input?.resource ?? null,
        amount: input?.amount ?? 0,
      });
    },
  /**
   * Add an input for `resource`, or, if one already exists, sum the amount
   * into it instead of creating a duplicate row. Falls back to a plain push
   * when `resource` is null (no usable merge key).
   */
  upsertFactoryInput:
    (
      factoryId: string,
      input: {
        resource: string | null;
        amount: number | null;
      },
    ) =>
    state => {
      const factory = state.factories.factories[factoryId];
      if (!factory) return;
      if (!factory.inputs) factory.inputs = [];

      const existing = input.resource
        ? factory.inputs.find(i => i.resource === input.resource)
        : undefined;

      if (existing) {
        existing.amount = (existing.amount ?? 0) + (input.amount ?? 0);
      } else {
        factory.inputs.push({
          resource: input.resource ?? null,
          amount: input.amount ?? 0,
        });
      }
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

  /**
   * Map → factory bridge: associate one or more world resource node ids
   * to a World input on a factory. Dedupes against any existing
   * assignment, and ALSO marks the nodes as used on the owning game so
   * the "hide used" filter behaves consistently. The reverse direction
   * (unassign) intentionally does NOT remove from `usedNodes` to avoid
   * fragile bookkeeping (the user can clear used marks from the map's
   * filter panel if needed).
   */
  assignNodesToFactoryInput:
    (
      factoryId: string,
      inputIndex: number,
      nodeIds: string[],
      gameId?: string | null,
    ) =>
    state => {
      // ─── Step 1: locate the input row. Silent no-op if the factory
      //     or input has been removed under us (the caller is the
      //     async modal, so a stale id is plausible).
      const factory = state.factories.factories[factoryId];
      const input = factory?.inputs?.[inputIndex];
      if (!input) return;

      // ─── Step 2: union the new ids into the existing assignment.
      //     Set-based dedup so re-assigning the same node is a no-op.
      const existing = new Set(input.nodeIds ?? []);
      for (const id of nodeIds) existing.add(id);
      input.nodeIds = Array.from(existing);

      // ─── Step 3: also mark the nodes as "used" at the game level
      //     so the map's "hide used" filter behaves consistently.
      //     Add-only by design — see the action JSDoc for why we
      //     never remove from `usedNodes` on unassign.
      if (gameId) {
        const game = state.games.games[gameId];
        if (game) {
          const usedSet = new Set(game.usedNodes ?? []);
          for (const id of nodeIds) usedSet.add(id);
          game.usedNodes = Array.from(usedSet);
        }
      }
    },

  unassignNodeFromFactoryInput:
    (factoryId: string, inputIndex: number, nodeId: string) => state => {
      const input = state.factories.factories[factoryId]?.inputs?.[inputIndex];
      if (!input?.nodeIds) return;

      // Splice in place (Immer turns this into an immutable update).
      const idx = input.nodeIds.indexOf(nodeId);
      if (idx !== -1) input.nodeIds.splice(idx, 1);

      // Drop the field entirely when empty so the persisted shape
      // stays clean (matches the convention used by `usedNodes`).
      if (input.nodeIds.length === 0) delete input.nodeIds;
    },

  clearInputAssignment: (factoryId: string, inputIndex: number) => state => {
    const input = state.factories.factories[factoryId]?.inputs?.[inputIndex];
    if (!input) return;
    // Bulk-clear: drop the whole array. `usedNodes` is intentionally
    // left untouched (add-only sync semantics).
    delete input.nodeIds;
  },

  addFactoryOutput:
    (factoryId: string, output?: Partial<FactoryOutput>) => state => {
      state.factories.factories[factoryId]?.outputs?.push({
        resource: output?.resource ?? null,
        amount: output?.amount ?? 0,
        ...(output?.objective !== undefined
          ? { objective: output.objective }
          : {}),
        ...(output?.somersloops !== undefined
          ? { somersloops: output.somersloops }
          : {}),
      });
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
        state.factories.factories[factoryId]?.outputs[outputIndex];

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

      if (output.destination !== undefined) {
        factoryOutput.destination = output.destination;
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
   *
   * @param somersloopsPerMachine - per-machine value (0..slots), used by the LP solver
   * @param somersloopsTotal - total across all buildings, used for factory output display
   */
  updateSolverSomersloops:
    (
      graph: ISolverSolution['graph'],
      factoryId: string,
      // nodeId is variable name
      nodeId: string,
      somersloopsPerMachine: number,
      somersloopsTotal: number,
    ) =>
    state => {
      // 1. Update the solver instance with the new somersloops value
      const solvers = state.solvers.instances;
      if (!solvers[factoryId]) return;
      if (!solvers[factoryId].nodes) solvers[factoryId].nodes = {};
      if (!solvers[factoryId].nodes[nodeId])
        solvers[factoryId].nodes[nodeId] = {};

      solvers[factoryId].nodes[nodeId].somersloops = somersloopsPerMachine;
      solvers[factoryId].nodes[nodeId].somersloopsTotal = somersloopsTotal;

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

        // Use somersloopsTotal for factory output display.
        // Fall back to somersloops (per-machine) for old saves where
        // somersloopsTotal doesn't exist yet.
        const displayTotal =
          somersloopNodeState.somersloopsTotal ??
          somersloopNodeState.somersloops ??
          0;

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
              logger.info(
                'Adding somersloops',
                displayTotal,
                'to output',
                output.resource,
                'from node',
                somersloopNodeId,
              ); // prettier-ignore
              output.somersloops = (output.somersloops ?? 0) + displayTotal;

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
  /**
   * Loads a shared solver as a dangling "preview" view: the new factory and
   * solver are stored under a freshly-minted `localId` that the caller
   * generates, and they are NOT added to any game's `factoriesIds`. This
   * keeps the share link non-destructive even when the owner opens their
   * own link from another game (or after editing the original): the
   * preview never collides with an existing local id.
   *
   * To save the preview into the current game, the user clicks the
   * existing "Add to Game" button on the calculator.
   */
  loadSharedSolver:
    (
      instance: SolverInstance,
      factory: Factory,
      data: {
        localId: string;
        sharedId: string;
      },
    ) =>
    state => {
      const { localId } = data;
      state.solvers.instances[localId] = {
        ...instance,
        id: localId,
        sharedId: undefined,
        remoteSharedId: data.sharedId,
        isOwner: false,
        isFactory: false,
      };
      state.factories.factories[localId] = {
        ...factory,
        id: localId,
      };
    },
});
