import { Avatar, Tooltip } from '@mantine/core';
import { useOnlinePeers } from './peersSlice';

export function OnlinePeers() {
  const peers = useOnlinePeers();
  if (peers.length === 0) return null;

  return (
    <Avatar.Group spacing="xs">
      {peers.map(peer => (
        <Tooltip key={peer.senderId} label={peer.displayName} withArrow>
          <Avatar src={peer.avatarUrl} size={28} radius="xl">
            {peer.displayName.charAt(0).toUpperCase()}
          </Avatar>
        </Tooltip>
      ))}
    </Avatar.Group>
  );
}
