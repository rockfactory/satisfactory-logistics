import type { RealtimeChannel } from '@supabase/supabase-js';
import { describe, expect, test, vi } from 'vitest';

// The peers slice transitively imports @/core/zustand, which at module load
// time constructs the full store (including notes UI defaults that read
// window.innerWidth). In a Node vitest run there is no window, so we stub
// the store module out — these tests only exercise pure utilities that
// don't touch zustand.
vi.mock('@/core/zustand', () => ({
  useStore: () => undefined,
}));

import {
  countOtherPeers,
  hasOtherPeersConnectedOnChannel,
  type PeerInfo,
} from './peersSlice';
import { type PresencePayload, SENDER_ID } from './realtimeSyncTypes';

function peer(senderId: string, overrides: Partial<PeerInfo> = {}): PeerInfo {
  return {
    senderId,
    userId: `user-${senderId}`,
    avatarUrl: null,
    displayName: `Name ${senderId}`,
    deviceName: `Device ${senderId}`,
    factoryId: null,
    ...overrides,
  };
}

function mockChannel(
  state: Record<string, PresencePayload[]>,
): RealtimeChannel {
  return {
    presenceState: <_T>() => state as Record<string, _T[]>,
  } as unknown as RealtimeChannel;
}

describe('countOtherPeers', () => {
  test('returns 0 when the map is empty', () => {
    expect(countOtherPeers({})).toBe(0);
  });

  test('excludes the current sender', () => {
    const peers = {
      [SENDER_ID]: peer(SENDER_ID),
      'other-1': peer('other-1'),
      'other-2': peer('other-2'),
    };
    expect(countOtherPeers(peers)).toBe(2);
  });

  test('returns 0 when only the current sender is present', () => {
    expect(countOtherPeers({ [SENDER_ID]: peer(SENDER_ID) })).toBe(0);
  });
});

describe('hasOtherPeersConnectedOnChannel', () => {
  function payload(senderId: string): PresencePayload {
    return {
      senderId,
      userId: `user-${senderId}`,
      avatarUrl: null,
      displayName: `Name ${senderId}`,
      deviceName: `Device ${senderId}`,
      factoryId: null,
    };
  }

  test('returns false when the channel is empty', () => {
    expect(hasOtherPeersConnectedOnChannel(mockChannel({}))).toBe(false);
  });

  test('returns false when only self is present', () => {
    expect(
      hasOtherPeersConnectedOnChannel(mockChannel({ a: [payload(SENDER_ID)] })),
    ).toBe(false);
  });

  test('returns true when at least one other sender is present', () => {
    expect(
      hasOtherPeersConnectedOnChannel(
        mockChannel({
          a: [payload(SENDER_ID)],
          b: [payload('other')],
        }),
      ),
    ).toBe(true);
  });

  test('ignores entries without a senderId', () => {
    expect(
      hasOtherPeersConnectedOnChannel(
        mockChannel({
          a: [{ ...payload(''), senderId: '' }],
        }),
      ),
    ).toBe(false);
  });

  test('handles multiple presences per key', () => {
    expect(
      hasOtherPeersConnectedOnChannel(
        mockChannel({
          a: [payload(SENDER_ID), payload('other-1')],
        }),
      ),
    ).toBe(true);
  });
});
