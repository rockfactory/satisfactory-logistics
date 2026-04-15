import { useMemo } from 'react';
import { useStore } from '@/core/zustand';
import { createSlice } from '@/core/zustand-helpers/slices';
import { SENDER_ID } from './realtimeSyncTypes';

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
