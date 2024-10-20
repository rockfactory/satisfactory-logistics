import { produce, WritableDraft } from 'immer';
import { ImmerActions } from './immer';

type InferState<Slices> = Slices extends [
  SliceConfig<infer Name, infer State, infer Actions>,
  ...infer Rest,
]
  ? { [K in Name]: State } & {
      [K in keyof Actions]: (...args: Parameters<Actions[K]>) => void;
    } & InferState<Rest>
  : unknown;

export function withSlices<
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
    get: () => InferState<Slices>,
  ) => {
    const state: Record<string, any> = {};

    for (const slice of slices) {
      state[slice.name] = slice.value;

      for (const [name, action] of Object.entries(slice.actions)) {
        state[name] = (...args: any[]) => {
          set(
            produce(prevState => action(...args)(prevState[slice.name], get)),
          );
        };
        (state[name] as any)[ImmerActions] = (state: any, ...args: any[]) => {
          action(...args)(state[slice.name], get);
        };
      }
    }

    return state as InferState<Slices>;
  };
}

export type SliceConfig<
  Name extends string,
  Value extends Record<string, any>,
  Actions extends Record<string, Action<Value>>,
> = {
  name: Name;
  value: Value;
  actions: Actions;
};

type SliceImmerArgs<Value> = [state: WritableDraft<Value>, get: () => Value];
type SliceVanillaArgs<Value> = [state: Value, get: () => Value];

export type Action<Value extends Record<string, any>> = (
  ...args: any[]
) => (state: WritableDraft<Value>, get: () => Value) => void;

export function createSlice<
  Name extends string,
  Value extends Record<string, any>,
  Actions extends Record<string, Action<Value>>,
>(config: SliceConfig<Name, Value, Actions>) {
  return config;
}
