import { Box } from '@mantine/core';
import { useMemo } from 'react';
import { useAllFactoryPeers } from '../peersSlice';
import { PeerAvatar } from './PeerAvatar';

export interface FactoryPeersProps {
  factoryId: string;
}

export function FactoryPeers({ factoryId }: FactoryPeersProps) {
  const peers = useAllFactoryPeers(factoryId);

  const deviceCountByUser = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of peers) {
      map.set(p.userId, (map.get(p.userId) ?? 0) + 1);
    }
    return map;
  }, [peers]);

  if (peers.length === 0) return null;

  return (
    <Box style={{ display: 'inline-flex', alignItems: 'center' }}>
      {peers.map((peer, idx) => (
        <Box
          key={peer.senderId}
          style={{
            marginLeft: idx === 0 ? 0 : -8,
            zIndex: peers.length - idx,
          }}
        >
          <PeerAvatar
            peer={peer}
            size={24}
            showDeviceBadge={(deviceCountByUser.get(peer.userId) ?? 0) > 1}
          />
        </Box>
      ))}
    </Box>
  );
}
