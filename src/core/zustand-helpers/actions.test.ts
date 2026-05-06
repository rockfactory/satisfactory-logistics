import { describe, expect, test } from 'vitest';
import { withActions } from './actions';
import type { Action } from './slices';

interface TestState {
  count: number;
  label: string;
}

interface TestStore extends TestState {
  addLabelLength: () => void;
  incrementBy: (amount: number) => void;
}

function createHarness() {
  const actions = {
    addLabelLength: () => (_state: TestState, get: () => TestStore) => {
      get().incrementBy(get().label.length);
    },
    incrementBy: (amount: number) => (state: TestState) => {
      state.count += amount;
    },
  } as unknown as Record<string, Action<TestState>>;

  let store: any;
  const get = () => store;
  const set = (fn: (prevState: any) => any) => {
    store = fn(store);
  };

  store = withActions(() => ({ count: 0, label: 'iron' }), actions)(
    set,
    get,
  ) as unknown as TestStore;

  return { get };
}

describe('withActions', () => {
  test('proxy get returns state properties as well as nested actions', () => {
    const harness = createHarness();

    harness.get().addLabelLength();

    expect(harness.get().count).toBe(4);
  });
});
