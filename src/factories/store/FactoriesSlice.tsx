import { createSlice, current, PayloadAction } from '@reduxjs/toolkit';
import { set } from 'lodash';
import { v4 } from 'uuid';

export interface GameFactory {
  id: string;
  name?: string | null;
  description?: string | null;
  outputs?: GameFactoryOutput[];
  // amount?: number | null; // Per minute
  powerConsumption?: number | null;
  inputs?: GameFactoryInput[];
}

export interface GameFactoryInput {
  factoryId?: string | null;
  resource?: string | null;
  amount?: number | null;
}

export interface GameFactoryOutput {
  resource: string | null;
  amount: number | null;
  somersloops?: number | null;
}

interface FactoriesFilters {
  name: string | null;
  resource: string | null;
}

export const FactoriesSlice = createSlice({
  name: 'Factories',
  initialState: {
    factories: [] as GameFactory[],
    filters: {
      name: null,
      resource: null,
    } as FactoriesFilters | undefined,
  },
  reducers: {
    add: (state, action: PayloadAction<{ name?: string }>) => {
      state.factories.push({ ...action.payload, id: v4() });
    },
    remove: (state, action: PayloadAction<{ id: string }>) => {
      state.factories = state.factories.filter(
        factory => factory.id !== action.payload.id,
      );
    },
    update: (state, action: PayloadAction<Partial<GameFactory>>) => {
      const factory = state.factories.find(
        factory => factory.id === action.payload.id,
      );
      if (factory) {
        Object.assign(factory, action.payload);
      }
    },
    sort: (state, action: PayloadAction<{ by: 'name' }>) => {
      state.factories.sort((a, b) => {
        if (a.name && b.name) {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
    },
    updateAtPath: (
      state,
      action: PayloadAction<{ id: string; path: string; value: any }>,
    ) => {
      console.log(
        action.payload,
        current(state).factories.find(
          factory => factory.id === action.payload.id,
        ),
      );

      const target = state.factories.find(
        factory => factory.id === action.payload.id,
      )!;
      set(target, action.payload.path, action.payload.value);
    },
    updateOutputAmount: (
      state,
      action: PayloadAction<{ id: string; index: number; value: number }>,
    ) => {
      const factory = state.factories.find(
        factory => factory.id === action.payload.id,
      );
      const output = factory?.outputs?.[action.payload.index];
      if (!output) return;

      output.somersloops = 0; // reset forzato
      output.amount = action.payload.value;
    },
    updateSomersloops: (
      state,
      action: PayloadAction<{ id: string; outputIndex: number; value: number }>,
    ) => {
      const factory = state.factories.find(
        factory => factory.id === action.payload.id,
      );
      const output = factory?.outputs?.[action.payload.outputIndex];
      if (!output) return;

      const nextSomersloops = action.payload.value;
      const prevSomersloops = output.somersloops ?? 0;
      if (nextSomersloops == 0 && prevSomersloops > 0)
        output.amount = (output.amount ?? 0) / 2;
      if (nextSomersloops > 0 && prevSomersloops == 0)
        output.amount = (output.amount ?? 0) * 2;

      output.somersloops = action.payload.value;
    },
    addInput: (state, action: PayloadAction<{ id: string }>) => {
      const factory = state.factories.find(
        factory => factory.id === action.payload.id,
      );
      if (!factory) return;
      if (!factory.inputs) factory.inputs = [];
      factory.inputs.push({ factoryId: null, amount: 0 });
    },
    addOutput: (state, action: PayloadAction<{ id: string }>) => {
      const factory = state.factories.find(
        factory => factory.id === action.payload.id,
      );
      if (!factory) return;
      if (!factory.outputs) factory.outputs = [];
      factory.outputs.push({ resource: null, amount: null });
    },
    setFilter: (
      state,
      action: PayloadAction<{ name: keyof FactoriesFilters; value: any }>,
    ) => {
      if (!state.filters) state.filters = { name: null, resource: null };
      state.filters[action.payload.name] = action.payload.value;
    },
  },
});

export const factoryActions = FactoriesSlice.actions;

export const factorySliceReducer = FactoriesSlice.reducer;
