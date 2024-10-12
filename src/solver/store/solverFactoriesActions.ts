import { cloneDeep } from 'lodash';
import { createActions } from '../../core/zustand-helpers/actions';
import { Factory, FactoryOutput } from '../../factories/Factory';
import { SolverRequest } from './Solver';

export const solverFactoriesActions = createActions({
  /**
   * Prepares a solver to a factory
   */
  upsertFactorySolver: (factoryId: string | undefined) => state => {
    if (!factoryId) return;
    if (state.solvers.instances[factoryId]) return;

    const factory = state.factories.factories[factoryId];
    const outputs =
      factory.outputs && factory.outputs.length > 0
        ? cloneDeep(factory.outputs)
        : [
            {
              resource: null,
              amount: 0,
            },
          ];

    const inputs =
      factory.inputs?.map(i => ({
        item: i.resource,
        amount: i.amount,
      })) ?? [];

    state.solvers.instances[factoryId] = {
      id: factoryId,
      isFactory: true,
      request: {
        inputs: inputs,
        outputs: outputs,
        objective: 'minimize_resources',
      },
    };
    state.factories.factories[factoryId].solverId = factoryId;
  },
  // Input/Output should be synced
  addFactoryInput: (factoryId: string) => state => {
    state.factories.factories[factoryId]?.inputs?.push({
      resource: null,
      amount: 0,
    });
    state.solvers.instances[factoryId]?.request.inputs?.push({
      resource: null,
      amount: 0,
    });
  },
  removeFactoryInput: (factoryId: string, inputIndex: number) => state => {
    state.factories.factories[factoryId]?.inputs?.splice(inputIndex, 1);
    state.solvers.instances[factoryId]?.request.inputs?.splice(inputIndex, 1);
  },
  addFactoryOutput: (factoryId: string) => state => {
    state.factories.factories[factoryId]?.outputs?.push({
      resource: null,
      amount: 0,
    });
    state.solvers.instances[factoryId]?.request.outputs.push({
      resource: null,
      amount: 0,
    });
  },
  removeFactoryOutput: (factoryId: string, outputIndex: number) => state => {
    state.factories.factories[factoryId]?.outputs?.splice(outputIndex, 1);
    state.solvers.instances[factoryId]?.request.outputs.splice(outputIndex, 1);
  },
  updateFactoryAndSolverRequest:
    (factoryId: string, fn: (item: Factory | SolverRequest) => void) =>
    state => {
      if (state.factories.factories[factoryId]) {
        fn(state.factories.factories[factoryId]);
      }
      if (state.solvers.instances[factoryId]?.request) {
        fn(state.solvers.instances[factoryId]?.request);
      }
    },
  updateFactoryOutput:
    (factoryId: string, outputIndex: number, output: Partial<FactoryOutput>) =>
    (state, get) => {
      const factoryOutput =
        state.factories.factories[factoryId]?.outputs![outputIndex];
      const solverOutput =
        state.solvers.instances[factoryId]?.request.outputs[outputIndex];

      if (output.resource) {
        if (factoryOutput) factoryOutput.resource = output.resource;
        if (solverOutput) solverOutput.resource = output.resource;
      }

      if (output.amount !== undefined) {
        if (factoryOutput) factoryOutput.amount = output.amount;
        if (solverOutput) solverOutput.amount = output.amount;
      }

      if (output.somersloops !== undefined) {
        if (factoryOutput) factoryOutput.somersloops = output.somersloops;
        if (solverOutput) solverOutput.somersloops = output.somersloops;

        // TODO Add back calculations to update amount vs input amount
      }
    },
});
