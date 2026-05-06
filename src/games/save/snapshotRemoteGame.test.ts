import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const rpcMock = vi.fn();
const useStoreGetState = vi.fn();
const serializeGameMock = vi.fn();

vi.mock('@/core/supabase', () => ({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
  supabaseClient: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

vi.mock('@/core/zustand', () => ({
  useStore: { getState: () => useStoreGetState() },
}));

vi.mock('@/games/store/gameFactoriesActions', () => ({
  serializeGame: (gameId: string) => serializeGameMock(gameId),
}));

import {
  __resetSnapshotThrottleForTests,
  maybeSnapshotRemote,
  REMOTE_SNAPSHOT_THROTTLE_MS,
  snapshotRemote,
} from './snapshotRemoteGame';

const stateWithGame = (savedId: string | undefined) => ({
  auth: { session: { user: { id: 'u1' } } },
  games: {
    games: {
      g1: { id: 'g1', savedId },
    },
  },
});

describe('snapshotRemoteGame', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    useStoreGetState.mockReset();
    serializeGameMock.mockReset();
    __resetSnapshotThrottleForTests();
    rpcMock.mockResolvedValue({ data: null, error: null });
    serializeGameMock.mockReturnValue({
      game: { id: 'g1' },
      factories: [],
      solvers: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('snapshotRemote calls the RPC with the right args', async () => {
    useStoreGetState.mockReturnValue(stateWithGame('saved-1'));
    await snapshotRemote('saved-1', 'manual', { foo: 'bar' } as never);
    expect(rpcMock).toHaveBeenCalledWith('snapshot_game', {
      p_saved_id: 'saved-1',
      p_data: { foo: 'bar' },
      p_reason: 'manual',
    });
  });

  test('snapshotRemote does nothing when there is no auth session', async () => {
    useStoreGetState.mockReturnValue({
      ...stateWithGame('saved-1'),
      auth: { session: null },
    });
    await snapshotRemote('saved-1', 'manual', {} as never);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  test('maybeSnapshotRemote dedupes within the throttle window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 1, 12, 0, 0));
    useStoreGetState.mockReturnValue(stateWithGame('saved-1'));

    await maybeSnapshotRemote('g1', { reason: 'auto' });
    expect(rpcMock).toHaveBeenCalledTimes(1);

    // Same game, within throttle window: skipped.
    vi.advanceTimersByTime(REMOTE_SNAPSHOT_THROTTLE_MS - 1000);
    await maybeSnapshotRemote('g1', { reason: 'auto' });
    expect(rpcMock).toHaveBeenCalledTimes(1);

    // Past the throttle window: fires again.
    vi.advanceTimersByTime(2_000);
    await maybeSnapshotRemote('g1', { reason: 'auto' });
    expect(rpcMock).toHaveBeenCalledTimes(2);
  });

  test('maybeSnapshotRemote skips when the game has no savedId', async () => {
    useStoreGetState.mockReturnValue(stateWithGame(undefined));
    await maybeSnapshotRemote('g1', { reason: 'auto' });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  test('maybeSnapshotRemote releases the throttle slot if the RPC throws', async () => {
    useStoreGetState.mockReturnValue(stateWithGame('saved-1'));
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    await maybeSnapshotRemote('g1', { reason: 'auto' });
    // First call failed (and snapshotRemote swallowed the error), so the
    // second one within the throttle window should still run.
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    await maybeSnapshotRemote('g1', { reason: 'auto' });
    expect(rpcMock).toHaveBeenCalledTimes(2);
  });
});
