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
  deviceName: string;
  factoryId: string | null;
}

export interface HttpPresenceSnapshot {
  // Count of other sessions currently active on the same save (any user,
  // any device, any tab — excludes our own sender_id). Drives the websocket
  // gate: if 0 we stay in HTTP-only mode. Same-user multi-tab/multi-device is
  // treated as a peer so cross-tab realtime sync keeps working for a single
  // logged-in user.
  otherSendersCount: number;
}

const EMPTY_HTTP_PRESENCE: HttpPresenceSnapshot = {
  otherSendersCount: 0,
};

export const peersSlice = createSlice({
  name: 'peers',
  value: {
    peers: {} as Record<string, PeerInfo>,
    httpPresence: EMPTY_HTTP_PRESENCE as HttpPresenceSnapshot,
  },
  actions: {
    setPeers: (peers: Record<string, PeerInfo>) => state => {
      state.peers = peers;
    },
    clearPeers: () => state => {
      state.peers = {};
    },
    setHttpPresence: (snapshot: HttpPresenceSnapshot) => state => {
      state.httpPresence = snapshot;
    },
    clearHttpPresence: () => state => {
      state.httpPresence = EMPTY_HTTP_PRESENCE;
    },
  },
});

function sortPeers(peers: PeerInfo[]): PeerInfo[] {
  // Self first, then alphabetical by displayName, then by deviceName to keep
  // multi-device peers of the same user adjacent and stable.
  return [...peers].sort((a, b) => {
    const aSelf = a.senderId === SENDER_ID ? 0 : 1;
    const bSelf = b.senderId === SENDER_ID ? 0 : 1;
    if (aSelf !== bSelf) return aSelf - bSelf;
    const byName = a.displayName.localeCompare(b.displayName);
    if (byName !== 0) return byName;
    return a.deviceName.localeCompare(b.deviceName);
  });
}

export function useAllPeers(): PeerInfo[] {
  const peers = useStore(s => s.peers.peers);
  return useMemo(() => sortPeers(Object.values(peers)), [peers]);
}

export function useAllFactoryPeers(factoryId: string): PeerInfo[] {
  const peers = useStore(s => s.peers.peers);
  return useMemo(
    () =>
      sortPeers(Object.values(peers).filter(p => p.factoryId === factoryId)),
    [peers, factoryId],
  );
}

export function useHttpOtherSendersCount(): number {
  return useStore(s => s.peers.httpPresence.otherSendersCount);
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
