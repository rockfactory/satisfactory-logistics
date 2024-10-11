import { produce, WritableDraft } from 'immer';
import { create } from 'zustand';
import { factoriesSlice } from '../factories/store/factoriesSlice';
import { gamesSlice } from '../games/gamesSlice';

const slices = withSlices(gamesSlice, factoriesSlice);
export type RootState = ReturnType<typeof slices>;
export const useStore = create(withActions(slices));

type InferState<Slices> = Slices extends [
  SliceConfig<infer Name, infer State, infer Actions>,
  ...infer Rest,
]
  ? { [K in Name]: State } & {
      [K in keyof Actions]: (...args: Parameters<Actions[K]>) => void;
    } & InferState<Rest>
  : unknown;

type InferActions<Actions> = Actions extends [
  Record<string, Action<any>>,
  ...infer Rest,
]
  ? InferActionsGroup<Actions> & InferActions<Rest>
  : unknown;

type InferActionsGroup<Actions> = Actions extends {
  [name: string]: Action<any>;
}
  ? {
      [K in keyof Actions]: (...args: Parameters<Actions[K]>) => void;
    }
  : unknown;

function withActions<
  State extends Record<string, any>,
  Actions extends Record<string, Action<State>>[],
>(
  stateMaker: (
    set: (fn: (prevState: State) => Partial<State>) => void,
  ) => State,
  ...actions: Actions
) {
  return (
    set: (
      fn: (
        prevState: State & InferActions<Actions>,
      ) => Partial<State & InferActions<Actions>>,
    ) => void,
    get: () => State & InferActions<Actions>,
  ) => {
    const state: Record<string, unknown> = stateMaker(set as never);
    for (const group of actions) {
      for (const [name, action] of Object.entries(group)) {
        state[name] = (...args: any[]) => {
          set(produce(prevState => action(...args)(prevState)));
        };
      }
    }
    return state as State & InferActions<Actions>;
  };
}

function withSlices<
  Slices extends SliceConfig<
    string,
    Record<string, any>,
    Record<string, Action<any>>
  >[],
>(...slices: [...Slices]) {
  return (
    set: (
      fn: (prevState: InferState<Slices>) => Partial<InferState<Slices>>,
    ) => void,
  ) => {
    const state: Record<string, any> = {};
    for (const slice of slices) {
      state[slice.name] = slice.value;

      for (const [name, action] of Object.entries(slice.actions)) {
        state[name] = (...args: any[]) => {
          set(produce(prevState => action(...args)(prevState)));
        };
      }
    }

    return state as InferState<Slices>;
  };
}

type SliceConfig<
  Name extends string,
  Value extends Record<string, any>,
  Actions extends Record<string, Action<Value>>,
> = {
  name: Name;
  value: Value;
  actions: Actions;
};

type Action<Value extends Record<string, any>> = (
  ...args: any[]
) => (state: WritableDraft<Value>) => void;

export function createSlice<
  Name extends string,
  Value extends Record<string, any>,
  Actions extends Record<string, Action<Value>>,
>(config: SliceConfig<Name, Value, Actions>) {
  return config;
}

export function createActions<
  Actions extends Record<string, Action<RootState>>,
>(actions: Actions) {
  return actions;
}
