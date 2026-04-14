import { v4 } from 'uuid';
import { useStore } from '@/core/zustand';
import { WORLD_SOURCE_ID } from '@/factories/Factory';

export const DEMO_NAME = 'The Smeltery';
export const DEMO_OUTPUT_RESOURCE = 'Desc_IronIngot_C';
export const DEMO_OUTPUT_AMOUNT = 30;
export const DEMO_INPUT_RESOURCE = 'Desc_OreIron_C';

export const CONSUMER_NAME = 'Platey McPlateface';
export const CONSUMER_OUTPUT = 'Desc_IronPlate_C';
export const CONSUMER_OUTPUT_AMOUNT = 20;
export const LINKED_INPUT = 'Desc_IronIngot_C';
export const LINKED_INPUT_AMOUNT = 15;

function isValidFactoryRef(id: string | null | undefined): boolean {
  if (!id) return false;
  const state = useStore.getState();
  const selectedGame = state.games.selected;
  if (!selectedGame) return false;
  const game = state.games.games[selectedGame];
  if (!game) return false;
  return !!state.factories.factories[id] && game.factoriesIds.includes(id);
}

/**
 * Reactive selector — true if any tutorial demo factory currently exists
 * in the active Game. Subscribe via `useStore(hasDemoFactoriesSelector)`.
 */
export function hasDemoFactoriesSelector(state: {
  tutorial: { demoFactoryId?: string | null; consumerFactoryId?: string | null };
  games: { selected: string | null; games: Record<string, { factoriesIds: string[] }> };
  factories: { factories: Record<string, unknown> };
}): boolean {
  const { demoFactoryId, consumerFactoryId } = state.tutorial;
  const game = state.games.games[state.games.selected ?? ''];
  if (!game) return false;
  const has = (id: string | null | undefined): boolean =>
    !!id && !!state.factories.factories[id] && game.factoriesIds.includes(id);
  return has(demoFactoryId) || has(consumerFactoryId);
}

/**
 * Idempotent: returns the existing demo factory id if still valid in the
 * current Game, otherwise creates a fresh "The Smeltery" factory and
 * stores its id in `tutorial.demoFactoryId`. Returns null if no Game is
 * selected.
 */
export function ensureDemoFactory(): string | null {
  const state = useStore.getState();
  const existing = state.tutorial.demoFactoryId;
  if (isValidFactoryRef(existing)) return existing as string;
  if (!state.games.selected) return null;

  const newId = v4();
  state.addGameFactory(newId, null, {
    name: DEMO_NAME,
    inputs: [
      {
        resource: DEMO_INPUT_RESOURCE,
        amount: null,
        constraint: 'input',
        factoryId: WORLD_SOURCE_ID,
      },
    ],
    outputs: [{ resource: DEMO_OUTPUT_RESOURCE, amount: DEMO_OUTPUT_AMOUNT }],
    progress: 'todo',
  });
  state.setDemoFactoryId(newId);
  return newId;
}

/**
 * Removes any tutorial demo factories the user still has in the current
 * Game and clears the matching ids from the tutorial slice. Safe to call
 * when nothing was created — it just no-ops on missing references. Used
 * by `useTutorial` whenever the tour ends (completion, opt-out, or
 * mid-chapter close) so we do not leave orphan factories behind.
 */
export function removeDemoFactories(): void {
  const state = useStore.getState();
  const { demoFactoryId, consumerFactoryId } = state.tutorial;

  if (consumerFactoryId && isValidFactoryRef(consumerFactoryId)) {
    state.removeGameFactory(consumerFactoryId);
  }
  if (demoFactoryId && isValidFactoryRef(demoFactoryId)) {
    state.removeGameFactory(demoFactoryId);
  }
  state.setDemoFactoryId(null);
  state.setConsumerFactoryId(null);
}

/**
 * Idempotent: returns the existing consumer factory id if still valid in
 * the current Game, otherwise creates "Platey McPlateface" linked to the
 * demo factory. Returns null if no Game is selected.
 */
export function ensureConsumerFactory(): string | null {
  const state = useStore.getState();
  const existing = state.tutorial.consumerFactoryId;
  if (isValidFactoryRef(existing)) return existing as string;
  if (!state.games.selected) return null;

  const newId = v4();
  state.addGameFactory(newId, null, {
    name: CONSUMER_NAME,
    inputs: [
      {
        resource: LINKED_INPUT,
        amount: LINKED_INPUT_AMOUNT,
        constraint: 'input',
        factoryId: useStore.getState().tutorial.demoFactoryId ?? undefined,
      },
    ],
    outputs: [{ resource: CONSUMER_OUTPUT, amount: CONSUMER_OUTPUT_AMOUNT }],
    progress: 'todo',
  });
  state.setConsumerFactoryId(newId);
  return newId;
}
