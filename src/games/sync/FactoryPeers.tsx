import { Avatar, Tooltip } from '@mantine/core';
import { useFactoryPeers } from './peersSlice';

export interface FactoryPeersProps {
  factoryId: string;
}

export function FactoryPeers({ factoryId }: FactoryPeersProps) {
  const peers = useFactoryPeers(factoryId);
  if (peers.length === 0) return null;

  return (
    <Avatar.Group spacing="xs">
      {peers.map(peer => (
        <Tooltip key={peer.senderId} label={peer.displayName} withArrow>
          <Avatar src={peer.avatarUrl} size={24} radius="xl">
            {peer.displayName.charAt(0).toUpperCase()}
          </Avatar>
        </Tooltip>
      ))}
    </Avatar.Group>
  );
}
