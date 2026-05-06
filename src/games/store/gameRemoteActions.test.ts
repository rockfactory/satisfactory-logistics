import { beforeEach, describe, expect, test, vi } from 'vitest';

// `@/core/zustand` builds the full Zustand store at module load (including
// UI defaults that touch `window`). Stub it to a minimal shape so the unit
// under test (`loadSerializedGameIntoState`) loads in a Node vitest run.
vi.mock('@/core/zustand', () => ({
  useStore: { getState: () => ({}) },
}));

vi.mock('@/core/zustand-helpers/actions', () => ({
  createActions: () => ({}),
}));

vi.mock('@/core/migrations/planner/StoreMigrationPlan', () => ({
  migrateSerializedGameWithPlan: (_plan: unknown, game: unknown) => game,
}));
vi.mock('@/core/migrations/v2', () => ({ storeMigrationV2: {} }));
vi.mock('@/core/migrations/v4', () => ({ storeMigrationV4: {} }));

import type { RootState } from '@/core/zustand';
import type { SerializedGame } from './gameFactoriesActions';
import { loadSerializedGameIntoState } from './gameRemoteActions';

function makeState(
  game: { id: string; updatedAt?: string; factoriesIds: string[] },
  factoryById: Record<string, { id: string; name?: string }> = {},
): RootState {
  return {
    games: {
      games: {
        [game.id]: {
          id: game.id,
          name: 'Local Name',
          version: 4,
          factoriesIds: game.factoriesIds,
          updatedAt: game.updatedAt,
          savedId: 'remote-id',
        } as never,
      },
    },
    factories: { factories: factoryById as never },
    solvers: { instances: {} },
    factoryView: { remoteSyncEpoch: 0 },
  } as unknown as RootState;
}

function makeSerialized(
  gameId: string,
  factories: { id: string; name?: string }[],
): SerializedGame {
  return {
    game: {
      id: gameId,
      name: 'Remote Name',
      version: 4,
      factoriesIds: factories.map(f => f.id),
    } as never,
    factories: factories as never,
    solvers: [],
  };
}

describe('loadSerializedGameIntoState', () => {
  beforeEach(() => {
    // Nothing per-test for now; keep hook for future setup.
  });

  test('refreshes metadata only when remote is not newer than local', () => {
    const state = makeState(
      { id: 'g1', updatedAt: '2026-05-06T10:00:00Z', factoriesIds: ['f-old'] },
      { 'f-old': { id: 'f-old', name: 'Old Local Factory' } },
    );

    const serialized = makeSerialized('g1', [
      { id: 'f-new', name: 'Should NOT appear' },
    ]);

    loadSerializedGameIntoState(
      serialized,
      {
        id: 'remote-id',
        author_id: 'u1',
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-06T09:00:00Z', // older than local
        share_token: 'tok-1',
      },
      state,
    );

    // Factories untouched: old still there, new not added.
    expect(state.factories.factories['f-old']).toBeDefined();
    expect(state.factories.factories['f-new']).toBeUndefined();
    // Game keeps the local factoriesIds.
    expect(state.games.games.g1.factoriesIds).toEqual(['f-old']);
    // Metadata refreshed (remote updated_at applied even when older: the
    // metadata-only branch always copies it).
    expect(state.games.games.g1.updatedAt).toBe('2026-05-06T09:00:00Z');
    expect(state.games.games.g1.shareToken).toBe('tok-1');
  });

  test('applies full remote state when remote is strictly newer', () => {
    const state = makeState(
      { id: 'g1', updatedAt: '2026-05-06T10:00:00Z', factoriesIds: ['f-old'] },
      { 'f-old': { id: 'f-old', name: 'Should be removed' } },
    );

    const serialized = makeSerialized('g1', [
      { id: 'f-new', name: 'From PC1' },
    ]);

    loadSerializedGameIntoState(
      serialized,
      {
        id: 'remote-id',
        author_id: 'u1',
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-06T11:00:00Z', // newer than local
        share_token: 'tok-1',
      },
      state,
    );

    // Override path: stale local factory removed, remote factory added.
    expect(state.factories.factories['f-old']).toBeUndefined();
    expect(state.factories.factories['f-new']).toBeDefined();
    expect(state.games.games.g1.factoriesIds).toEqual(['f-new']);
    expect(state.games.games.g1.updatedAt).toBe('2026-05-06T11:00:00Z');
  });

  test('treats equal timestamps as not-newer (metadata-only branch)', () => {
    const ts = '2026-05-06T10:00:00Z';
    const state = makeState(
      { id: 'g1', updatedAt: ts, factoriesIds: ['f-old'] },
      { 'f-old': { id: 'f-old', name: 'Local' } },
    );

    const serialized = makeSerialized('g1', [
      { id: 'f-new', name: 'Should NOT appear' },
    ]);

    loadSerializedGameIntoState(
      serialized,
      {
        id: 'remote-id',
        author_id: 'u1',
        created_at: '2026-05-01T00:00:00Z',
        updated_at: ts,
        share_token: 'tok-1',
      },
      state,
    );

    expect(state.factories.factories['f-old']).toBeDefined();
    expect(state.factories.factories['f-new']).toBeUndefined();
    expect(state.games.games.g1.factoriesIds).toEqual(['f-old']);
  });

  test('full-loads when the game does not exist locally', () => {
    const state = {
      games: { games: {} },
      factories: { factories: {} },
      solvers: { instances: {} },
      factoryView: { remoteSyncEpoch: 0 },
    } as unknown as RootState;

    const serialized = makeSerialized('g-new', [
      { id: 'f-1', name: 'From cloud' },
    ]);

    loadSerializedGameIntoState(
      serialized,
      {
        id: 'remote-id',
        author_id: 'u1',
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-06T11:00:00Z',
        share_token: 'tok-1',
      },
      state,
    );

    expect(state.games.games['g-new']).toBeDefined();
    expect(state.games.games['g-new'].savedId).toBe('remote-id');
    expect(state.factories.factories['f-1']).toBeDefined();
    // First-load: no existing state to remount; epoch should NOT bump.
    expect(state.factoryView.remoteSyncEpoch).toBe(0);
  });

  test('bumps remoteSyncEpoch when override replaces existing data', () => {
    const state = makeState(
      { id: 'g1', updatedAt: '2026-05-06T10:00:00Z', factoriesIds: ['f-old'] },
      { 'f-old': { id: 'f-old', name: 'Local' } },
    );

    const serialized = makeSerialized('g1', [
      { id: 'f-new', name: 'From PC1' },
    ]);

    loadSerializedGameIntoState(
      serialized,
      {
        id: 'remote-id',
        author_id: 'u1',
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-06T11:00:00Z',
        share_token: 'tok-1',
      },
      state,
    );

    expect(state.factoryView.remoteSyncEpoch).toBe(1);
  });

  test('does NOT bump remoteSyncEpoch on metadata-only refresh', () => {
    const state = makeState(
      { id: 'g1', updatedAt: '2026-05-06T10:00:00Z', factoriesIds: ['f-old'] },
      { 'f-old': { id: 'f-old', name: 'Local' } },
    );

    const serialized = makeSerialized('g1', [
      { id: 'f-new', name: 'Should NOT appear' },
    ]);

    loadSerializedGameIntoState(
      serialized,
      {
        id: 'remote-id',
        author_id: 'u1',
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-06T09:00:00Z', // older than local
        share_token: 'tok-1',
      },
      state,
    );

    expect(state.factoryView.remoteSyncEpoch).toBe(0);
  });
});
