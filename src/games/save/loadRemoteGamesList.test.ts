import { beforeEach, describe, expect, test, vi } from 'vitest';

const useStoreGetState = vi.fn();
const snapshotRemoteMock = vi.fn();
const serializeGameMock = vi.fn();

vi.mock('@/core/supabase', () => ({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
  supabaseClient: {
    from: () => ({ select: () => ({ order: () => Promise.resolve({}) }) }),
  },
}));

vi.mock('@/core/zustand', () => ({
  useStore: { getState: () => useStoreGetState() },
}));

vi.mock('@/games/save/loadRemoteGame', () => ({
  loadRemoteGameBySavedId: vi.fn(),
}));

vi.mock('@/games/save/snapshotRemoteGame', () => ({
  snapshotRemote: (...args: unknown[]) => snapshotRemoteMock(...args),
}));

vi.mock('@/games/store/gameFactoriesActions', () => ({
  serializeGame: (gameId: string) => serializeGameMock(gameId),
}));

vi.mock('./dirtyTrackingSuppression', () => ({
  withSuppressedDirtyTracking: (fn: () => void) => fn(),
}));

import {
  type RemoteLoadedGamesList,
  snapshotPreCloudMerge,
} from './loadRemoteGamesList';

type RemoteRow = RemoteLoadedGamesList[number];

function row(overrides: Partial<RemoteRow> = {}): RemoteRow {
  return {
    id: 'remote-id-1',
    name: 'Remote Name',
    author_id: 'u1',
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-06T11:00:00Z',
    share_token: null,
    ...overrides,
  } as RemoteRow;
}

function stateWith(
  game: {
    id?: string;
    savedId?: string;
    updatedAt?: string;
    name?: string;
  } | null,
) {
  return {
    games: {
      games: game?.id
        ? {
            [game.id]: {
              id: game.id,
              name: game.name ?? 'Local',
              savedId: game.savedId,
              updatedAt: game.updatedAt,
            },
          }
        : {},
    },
  };
}

describe('snapshotPreCloudMerge', () => {
  beforeEach(() => {
    useStoreGetState.mockReset();
    snapshotRemoteMock.mockReset();
    serializeGameMock.mockReset();
    snapshotRemoteMock.mockResolvedValue(true);
    serializeGameMock.mockReturnValue({
      game: { id: 'g1' },
      factories: [],
      solvers: [],
    });
  });

  test('snapshots and reports the name when remote is strictly newer', async () => {
    useStoreGetState.mockReturnValue(
      stateWith({
        id: 'g1',
        savedId: 'remote-id-1',
        updatedAt: '2026-05-06T10:00:00Z',
        name: 'My Save',
      }),
    );

    const names = await snapshotPreCloudMerge([row()]);

    expect(snapshotRemoteMock).toHaveBeenCalledTimes(1);
    expect(snapshotRemoteMock).toHaveBeenCalledWith(
      'remote-id-1',
      'pre-cloud-merge',
      expect.objectContaining({ game: { id: 'g1' } }),
    );
    expect(names).toEqual(['My Save']);
  });

  test('skips when remote is older than local', async () => {
    useStoreGetState.mockReturnValue(
      stateWith({
        id: 'g1',
        savedId: 'remote-id-1',
        updatedAt: '2026-05-06T12:00:00Z',
      }),
    );

    const names = await snapshotPreCloudMerge([row()]);
    expect(snapshotRemoteMock).not.toHaveBeenCalled();
    expect(names).toEqual([]);
  });

  test('skips when remote and local timestamps match', async () => {
    const ts = '2026-05-06T11:00:00Z';
    useStoreGetState.mockReturnValue(
      stateWith({ id: 'g1', savedId: 'remote-id-1', updatedAt: ts }),
    );

    const names = await snapshotPreCloudMerge([row({ updated_at: ts })]);
    expect(snapshotRemoteMock).not.toHaveBeenCalled();
    expect(names).toEqual([]);
  });

  test('skips when local game is unknown', async () => {
    useStoreGetState.mockReturnValue(stateWith(null));
    const names = await snapshotPreCloudMerge([row()]);
    expect(snapshotRemoteMock).not.toHaveBeenCalled();
    expect(names).toEqual([]);
  });

  test('skips when savedId mismatches the remote row id', async () => {
    // Defends against id collisions after import/restore: same local game.id
    // but the row was authored elsewhere.
    useStoreGetState.mockReturnValue(
      stateWith({
        id: 'g1',
        savedId: 'different-saved',
        updatedAt: '2026-05-06T10:00:00Z',
      }),
    );

    const names = await snapshotPreCloudMerge([row()]);
    expect(snapshotRemoteMock).not.toHaveBeenCalled();
    expect(names).toEqual([]);
  });

  test('skips when local has no updatedAt yet', async () => {
    useStoreGetState.mockReturnValue(
      stateWith({ id: 'g1', savedId: 'remote-id-1', updatedAt: undefined }),
    );

    const names = await snapshotPreCloudMerge([row()]);
    expect(snapshotRemoteMock).not.toHaveBeenCalled();
    expect(names).toEqual([]);
  });

  test('does not report the name when the snapshot RPC fails', async () => {
    useStoreGetState.mockReturnValue(
      stateWith({
        id: 'g1',
        savedId: 'remote-id-1',
        updatedAt: '2026-05-06T10:00:00Z',
        name: 'My Save',
      }),
    );
    snapshotRemoteMock.mockResolvedValueOnce(false);

    const names = await snapshotPreCloudMerge([row()]);
    expect(snapshotRemoteMock).toHaveBeenCalledTimes(1);
    expect(names).toEqual([]);
  });
});
