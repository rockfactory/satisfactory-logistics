import { produce } from 'immer';
import type { RootState } from '../zustand';
import { ImmerActions } from './immer';
import { Action } from './slices';

type InferActions<Actions> = Actions extends [infer ActionGroup, ...infer Rest]
  ? InferActionsGroup<ActionGroup> & InferActions<Rest>
  : unknown;

type InferActionsGroup<ActionGroup> = ActionGroup extends {
  [name: string]: Action<any>;
}
  ? {
      [K in keyof ActionGroup]: (...args: Parameters<ActionGroup[K]>) => void;
    }
  : unknown;

export function withActions<
  Actions extends Record<string, Action<State>>[],
  State extends Record<string, any> = RootState,
>(
  stateMaker: (
    set: (fn: (prevState: State) => Partial<State>) => void,
    get: () => State,
  ) => State,
  ...actions: [...Actions]
) {
  return (
    set: (
      fn: (
        prevState: State & InferActions<Actions>,
      ) => Partial<State & InferActions<Actions>>,
    ) => void,
    get: () => State & InferActions<Actions>,
  ) => {
    const state: Record<string, unknown> = stateMaker(set as never, get);
    if (!state[ImmerActions]) state[ImmerActions] = {};

    const proxyGet = (state: State) => () =>
      new Proxy(get(), {
        get: (target, prop) => {
          if (typeof prop === 'string' && target[ImmerActions][prop]) {
            return (...args: any[]) =>
              target[ImmerActions][prop](state, ...args);
          }
          return target.prop;
        },
      });

    for (const group of actions) {
      for (const [name, action] of Object.entries(group)) {
        state[name] = (...args: any[]) => {
          set(
            produce(prevState =>
              action(...args)(prevState, proxyGet(prevState)),
            ),
          );
        };
        (state as any)[ImmerActions][name] = (state: State, ...args: any[]) => {
          action(...args)(state, get);
        };
      }
    }
    return state as State & InferActions<Actions>;
  };
}

export function createActions<
  Actions extends Record<string, Action<RootState>>,
>(actions: Actions) {
  return actions;
}
