import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock the Supabase client before importing the module under test. We only
// stub the surface actually exercised: `from().upsert(...)` and a chainable
// select query ending in an awaited result.

const upsertMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/core/supabase', () => ({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
  supabaseClient: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import { fetchPresence, upsertPresence } from './gamePresenceClient';
import { PRESENCE_TTL_SECONDS } from './realtimeSyncTypes';

type QueryResult = { data: unknown; error: unknown };

function buildSelectBuilder(result: QueryResult) {
  const calls = {
    eq: [] as unknown[][],
    gt: [] as unknown[][],
    abortSignal: [] as unknown[][],
  };
  const builder: Record<string, unknown> = {};
  const thenable = {
    // biome-ignore lint/suspicious/noThenProperty: fake thenable for awaited query chain
    then(resolve: (value: QueryResult) => void) {
      resolve(result);
    },
  };
  Object.assign(builder, thenable, {
    eq: (col: string, value: unknown) => {
      calls.eq.push([col, value]);
      return builder;
    },
    gt: (col: string, value: unknown) => {
      calls.gt.push([col, value]);
      return builder;
    },
    abortSignal: (signal: AbortSignal) => {
      calls.abortSignal.push([signal]);
      return builder;
    },
  });
  return { builder, calls };
}

describe('upsertPresence', () => {
  beforeEach(() => {
    upsertMock.mockReset();
    fromMock.mockReset();
    fromMock.mockImplementation(() => ({ upsert: upsertMock }));
    upsertMock.mockResolvedValue({ error: null });
  });

  test('targets the game_presence table', async () => {
    await upsertPresence({ savedId: 's1', senderId: 'x1', userId: 'u1' });
    expect(fromMock).toHaveBeenCalledWith('game_presence');
  });

  test('sends the expected payload and conflict target', async () => {
    await upsertPresence({ savedId: 's1', senderId: 'x1', userId: 'u1' });
    const [row, options] = upsertMock.mock.calls[0];
    expect(row).toMatchObject({
      saved_id: 's1',
      sender_id: 'x1',
      user_id: 'u1',
    });
    expect(typeof row.last_seen_at).toBe('string');
    expect(new Date(row.last_seen_at).toString()).not.toBe('Invalid Date');
    expect(options).toEqual({ onConflict: 'saved_id,sender_id' });
  });

  test('throws when the SDK reports an error', async () => {
    upsertMock.mockResolvedValue({ error: { message: 'boom' } });
    await expect(
      upsertPresence({ savedId: 's1', senderId: 'x1', userId: 'u1' }),
    ).rejects.toThrow(/boom/);
  });
});

describe('fetchPresence', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  test('filters by savedId and TTL cutoff', async () => {
    const rows = [
      {
        saved_id: 's1',
        sender_id: 'a',
        user_id: 'u1',
        last_seen_at: '2024-01-01T00:00:00Z',
      },
    ];
    const { builder, calls } = buildSelectBuilder({ data: rows, error: null });
    fromMock.mockImplementation(() => ({ select: () => builder }));

    const result = await fetchPresence({ savedId: 's1' });
    expect(result).toEqual(rows);

    expect(calls.eq).toEqual([['saved_id', 's1']]);
    expect(calls.gt).toHaveLength(1);
    const [col, cutoff] = calls.gt[0];
    expect(col).toBe('last_seen_at');
    const cutoffMs = new Date(cutoff as string).getTime();
    // Cutoff should sit roughly PRESENCE_TTL_SECONDS in the past (within a
    // generous envelope to absorb the test run time).
    const expected = Date.now() - PRESENCE_TTL_SECONDS * 1000;
    expect(cutoffMs).toBeGreaterThan(expected - 5_000);
    expect(cutoffMs).toBeLessThan(expected + 5_000);
  });

  test('attaches an AbortSignal when provided', async () => {
    const { builder, calls } = buildSelectBuilder({ data: [], error: null });
    fromMock.mockImplementation(() => ({ select: () => builder }));

    const signal = new AbortController().signal;
    await fetchPresence({ savedId: 's1', signal });
    expect(calls.abortSignal).toEqual([[signal]]);
  });

  test('rethrows aborts as AbortError', async () => {
    const controller = new AbortController();
    controller.abort();
    const { builder } = buildSelectBuilder({
      data: null,
      error: { message: 'aborted' },
    });
    fromMock.mockImplementation(() => ({ select: () => builder }));

    await expect(
      fetchPresence({ savedId: 's1', signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  test('throws on non-abort SDK errors', async () => {
    const { builder } = buildSelectBuilder({
      data: null,
      error: { message: 'rls-violation' },
    });
    fromMock.mockImplementation(() => ({ select: () => builder }));

    await expect(fetchPresence({ savedId: 's1' })).rejects.toThrow(
      /rls-violation/,
    );
  });

  test('returns an empty array when data is null', async () => {
    const { builder } = buildSelectBuilder({ data: null, error: null });
    fromMock.mockImplementation(() => ({ select: () => builder }));

    await expect(fetchPresence({ savedId: 's1' })).resolves.toEqual([]);
  });
});
