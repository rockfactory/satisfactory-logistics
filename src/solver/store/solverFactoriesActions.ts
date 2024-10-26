import { loglev } from '@/core/logger/log';
import { isWorldResource } from '@/recipes/WorldResources';
import type { Node } from '@xyflow/react';
import { v4 } from 'uuid';
import { createActions } from '../../core/zustand-helpers/actions';
import {
  Factory,
  FactoryOutput,
  WORLD_SOURCE_ID,
  type FactoryInput,
} from '../../factories/Factory';
import type { IResourceNodeData } from '../layout/ResourceNode';
import type { ISolverSolution } from '../page/SolverPage';
import { SolverRequest, type SolverInstance } from './Solver';

const logger = loglev.getLogger('store:solver-factories');

export const solverFactoriesActions = createActions({
  /**
   * Prepares a solver-factory
   */
  upsertFactorySolver:
    (factoryId: string | undefined, factory?: Partial<Factory>) =>
    (state, get) => {
      if (!factoryId) factoryId = v4();
      if (!state.factories.factories[factoryId]) {
        logger.log('Creating factory', factoryId);
        get().createFactory(factoryId, factory);

        // If we are creating a new solver without a factory,
        // we still don't link the factory to the game.
        // The player can do this manually later.
        // get().addFactoryIdToGame(undefined, factoryId);
      }

      if (!state.solvers.instances[factoryId]) {
        logger.log('Creating solver', factoryId);
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
      state.factories.factories[factoryId]?.inputs?.push({
        resource: input?.resource ?? null,
        amount: input?.amount ?? 0,
      });
    },
  removeFactoryInput: (factoryId: string, inputIndex: number) => state => {
    state.factories.factories[factoryId]?.inputs?.splice(inputIndex, 1);
    // state.solvers.instances[factoryId]?.request.inputs?.splice(inputIndex, 1);
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
        if (output.amount != factoryOutput.amount) {
          factoryOutput.somersloops = 0;
          factoryOutput.amount = output.amount;
        }
      }

      if (output.somersloops !== undefined) {
        factoryOutput.somersloops = output.somersloops;
        // TODO Add back calculations to update amount vs input amount.
        // This could be calculated based on the Plan (solver), only if present.
        // We need to save selected recipes too.
      }
    },
  autoSetInputsFromSolver:
    (factoryId: string, solution: ISolverSolution) => state => {
      const factory = state.factories.factories[factoryId];
      if (!factory) return;

      const prevInputs = factory.inputs;
      const nextInputs = [] as FactoryInput[];

      const inputNodes = solution.nodes.filter(
        (n): n is Node<IResourceNodeData, 'Resource'> => n.type === 'Resource',
      );
      for (const node of inputNodes) {
        const input = prevInputs.find(
          i => i.resource === node.data.resource.id,
        );
        if (input) {
          input.amount = node.data.value;
          nextInputs.push(input);
        } else {
          nextInputs.push({
            resource: node.data.resource.id,
            amount: node.data.value,
            factoryId: isWorldResource(node.data.resource.id)
              ? WORLD_SOURCE_ID
              : undefined,
          });
        }
      }
      factory.inputs = nextInputs;
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
