import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { set } from 'lodash';
import { useSelector } from 'react-redux';
import { v4 } from 'uuid';
import { RootState } from '../../../core/store';

export interface SolverRequest {
  outputs: Array<{
    item?: string | undefined | null;
    amount?: number | undefined | null;
  }>;
  allowedRecipes?: string[] | null;
}

interface SolverInstance {
  id: string;
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
          request: { outputs: [{}] },
        };
      }
    },
    remove: (state, action: PayloadAction<{ id: string }>) => {
      delete state.instances[action.payload.id];
      if (state.current === action.payload.id) {
        state.current = null;
      }
    },
    updateAtPath: (
      state,
      action: PayloadAction<{ id?: string; path: string; value: any }>,
    ) => {
      const { id, path, value } = action.payload;
      set(state.instances[id ?? state.current!], path, value);
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
