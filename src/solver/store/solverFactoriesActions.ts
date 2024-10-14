import { loglev } from '@/core/logger/log';
import { v4 } from 'uuid';
import { createActions } from '../../core/zustand-helpers/actions';
import { Factory, FactoryOutput } from '../../factories/Factory';
import { SolverRequest } from './Solver';

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
        logger.log('Creating solver', factoryId, {
          gt: get(),
          cs: get().createSolver,
        });
        const gameAllowedRecipes =
          state.games.games[state.games.selected ?? '']?.allowedRecipes;
        get().createSolver(factoryId, { allowedRecipes: gameAllowedRecipes });
      }
    },
  // Input/Output should be synced
  addFactoryInput: (factoryId: string) => state => {
    state.factories.factories[factoryId]?.inputs?.push({
      resource: null,
      amount: 0,
    });
    // state.solvers.instances[factoryId]?.request.inputs?.push({
    //   resource: null,
    //   amount: 0,
    // });
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
        factoryOutput.amount = output.amount;
      }

      if (output.somersloops !== undefined) {
        factoryOutput.somersloops = output.somersloops;
        // TODO Add back calculations to update amount vs input amount
      }
    },
});
