import { createSlice, current, PayloadAction } from "@reduxjs/toolkit";
import { set } from "lodash";
import { v4 } from "uuid";

export interface GameFactory {
  id: string;
  name?: string | null;
  description?: string | null;
  output?: string | null;
  amount?: number | null; // Per minute
  powerConsumption?: number | null;
  somerloops?: number | null;
  inputs?: Array<{
    factoryId?: string | null;
    resource?: string | null;
    amount?: number | null;
  }>;
}

export const FactoriesSlice = createSlice({
  name: "Factories",
  initialState: {
    factories: [] as GameFactory[],
  },
  reducers: {
    add: (state, action: PayloadAction<{ name?: string }>) => {
      state.factories.push({ ...action.payload, id: v4() });
    },
    remove: (state, action: PayloadAction<{ id: string }>) => {
      state.factories = state.factories.filter(
        (factory) => factory.id !== action.payload.id
      );
    },
    update: (state, action: PayloadAction<Partial<GameFactory>>) => {
      const factory = state.factories.find(
        (factory) => factory.id === action.payload.id
      );
      if (factory) {
        Object.assign(factory, action.payload);
      }
    },
    updateAtPath: (
      state,
      action: PayloadAction<{ id: string; path: string; value: any }>
    ) => {
      console.log(
        action.payload,
        current(state).factories.find(
          (factory) => factory.id === action.payload.id
        )
      );
      set(
        state.factories.find((factory) => factory.id === action.payload.id)!,
        action.payload.path,
        action.payload.value
      );
    },
    addInput: (state, action: PayloadAction<{ id: string }>) => {
      const factory = state.factories.find(
        (factory) => factory.id === action.payload.id
      );
      if (!factory) return;
      if (!factory.inputs) factory.inputs = [];
      factory.inputs.push({ factoryId: null, amount: 0 });
    },
  },
});

export const factoryActions = FactoriesSlice.actions;

export const factorySliceReducer = FactoriesSlice.reducer;
