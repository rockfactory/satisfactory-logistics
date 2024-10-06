import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { set } from 'lodash';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { v4 } from 'uuid';
import { RootState } from '../../../core/store';
import { GameFactory } from '../../../factories/store/FactoriesSlice';
import { AllFactoryRecipes } from '../../FactoryRecipe';

export interface SolverRequest {
  inputs?: Array<{
    item?: string | undefined | null;
    amount?: number | undefined | null;
  }>;
  outputs: Array<{
    item?: string | undefined | null;
    amount?: number | undefined | null;
  }>;
  allowedRecipes?: string[] | null;
}

interface SolverInstance {
  id: string;
  isFactory?: boolean;
  request: SolverRequest;
  solution?: any; // TODO type this
}

export interface SolverState {
  current: string | null;
  instances: Record<string, SolverInstance>;
}

export const SolverSlice = createSlice({
  name: 'Solver',
  initialState: {
    current: null,
    instances: {},
  } as SolverState,
  reducers: {
    createIfNoCurrent: (state, action: PayloadAction<{}>) => {
      if (!state.current) {
        state.current = v4();
        state.instances[state.current] = {
          id: state.current,
          request: { inputs: [], outputs: [{}] },
        };
      }
    },
    prepareForFactory: (
      state,
      action: PayloadAction<{ factory: GameFactory }>,
    ) => {
      const { factory } = action.payload;
      if (state.instances[factory.id]) return;

      const outputs =
        factory.outputs && factory.outputs.length > 0
          ? factory.outputs.map(o => ({
              item: o.resource,
              amount: o.amount,
            }))
          : [{}];

      const inputs =
        factory.inputs?.map(i => ({
          item: i.resource,
          amount: i.amount,
        })) ?? [];

      state.instances[factory.id] = {
        id: factory.id,
        isFactory: true,
        request: {
          inputs,
          outputs,
        },
      };
    },
    remove: (state, action: PayloadAction<{ id: string }>) => {
      delete state.instances[action.payload.id];
      if (state.current === action.payload.id) {
        state.current = null;
      }
    },
    addInput: (state, action: PayloadAction<{ id: string }>) => {
      if (!state.instances[action.payload.id]?.request.inputs) {
        state.instances[action.payload.id]!.request.inputs = [];
      }
      state.instances[action.payload.id]?.request?.inputs?.push({});
    },

    addOutput: (state, action: PayloadAction<{ id: string }>) => {
      state.instances[action.payload.id]?.request.outputs.push({});
    },
    updateAtPath: (
      state,
      action: PayloadAction<{ id?: string; path: string; value: any }>,
    ) => {
      const { id, path, value } = action.payload;
      set(state.instances[id ?? state.current!], path, value);
    },
    toggleRecipe: (
      state,
      action: PayloadAction<{ id?: string; recipe: string; use: boolean }>,
    ) => {
      const { use, id, recipe } = action.payload;
      const instance = state.instances[id ?? state.current!];
      if (!instance.request.allowedRecipes) {
        instance.request.allowedRecipes = AllFactoryRecipes.map(r => r.id);
      }
      const index = instance.request.allowedRecipes.indexOf(recipe);
      if (use && index === -1) {
        instance.request.allowedRecipes.push(recipe);
      } else if (!use && index !== -1) {
        instance.request.allowedRecipes.splice(index, 1);
      }
    },
    enableRecipe: (
      state,
      action: PayloadAction<{ id?: string; recipe: string | string[] }>,
    ) => {
      const { id, recipe } = action.payload;
      const instance = state.instances[id ?? state.current!];
      if (!instance.request.allowedRecipes) {
        instance.request.allowedRecipes = AllFactoryRecipes.map(r => r.id);
      }
      instance.request.allowedRecipes.push(...recipe);
    },
  },
});

export const solverActions = SolverSlice.actions;

export const solverSliceReducer = SolverSlice.reducer;

export const useCurrentSolverInstance = () =>
  useSelector((state: RootState) =>
    state.solver.present.current
      ? state.solver.present.instances[state.solver.present.current]
      : null,
  );

export const usePathSolverInstance = () => {
  const id = useParams<{ id: string }>().id;
  return useSelector((state: RootState) =>
    id ? state.solver.present.instances[id] : null,
  );
};

export const usePathSolverAllowedRecipes = () => {
  const id = useParams<{ id: string }>().id;
  return useSelector((state: RootState) =>
    id ? state.solver.present.instances[id]?.request.allowedRecipes : null,
  );
};
