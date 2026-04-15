import type { RealtimeChannel } from '@supabase/supabase-js';
import { useMemo } from 'react';
import { useStore } from '@/core/zustand';
import { createSlice } from '@/core/zustand-helpers/slices';
import { type PresencePayload, SENDER_ID } from './realtimeSyncTypes';

export interface PeerInfo {
  senderId: string;
  userId: string;
  avatarUrl: string | null;
  displayName: string;
  factoryId: string | null;
}

export const peersSlice = createSlice({
  name: 'peers',
  value: {
    peers: {} as Record<string, PeerInfo>,
  },
  actions: {
    setPeers: (peers: Record<string, PeerInfo>) => state => {
      state.peers = peers;
    },
    clearPeers: () => state => {
      state.peers = {};
    },
  },
});

export function useOnlinePeers(): PeerInfo[] {
  const peers = useStore(s => s.peers.peers);
  return useMemo(
    () => Object.values(peers).filter(p => p.senderId !== SENDER_ID),
    [peers],
  );
}

export function useFactoryPeers(factoryId: string): PeerInfo[] {
  const peers = useStore(s => s.peers.peers);
  return useMemo(
    () =>
      Object.values(peers).filter(
        p => p.senderId !== SENDER_ID && p.factoryId === factoryId,
      ),
    [peers, factoryId],
  );
}

export function countOtherPeers(peers: Record<string, PeerInfo>): number {
  let count = 0;
  for (const senderId of Object.keys(peers)) {
    if (senderId !== SENDER_ID) count++;
  }
  return count;
}

/**
 * Reads peers directly from the realtime channel's presenceState instead of
 * the zustand slice. The slice is updated only on `presence.sync` events
 * (handled by `computeLeaderAndPeers`), so it lags behind the channel by up
 * to a few hundred ms after subscribe — long enough that the first patches
 * after joining could be wrongly skipped as "no peers". The channel itself
 * always knows the current presence list.
 */
export function hasOtherPeersConnectedOnChannel(
  channel: RealtimeChannel,
): boolean {
  const state = channel.presenceState<PresencePayload>();
  for (const presences of Object.values(state)) {
    for (const p of presences) {
      if (p.senderId && p.senderId !== SENDER_ID) return true;
    }
  }
  return false;
}
