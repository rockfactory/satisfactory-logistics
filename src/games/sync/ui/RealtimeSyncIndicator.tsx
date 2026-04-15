import { Box, Group, Tooltip } from '@mantine/core';
import { IconBroadcast, IconBroadcastOff } from '@tabler/icons-react';
import { useStore } from '@/core/zustand';
import { useAllPeers } from '../peersSlice';
import { OnlinePeers } from './OnlinePeers';

export function RealtimeSyncIndicator() {
  const isConnected = useStore(s => s.gameSave.isRealtimeSyncConnected);
  const peers = useAllPeers();

  if (!isConnected && peers.length === 0) return null;

  return (
    <Group
      gap={10}
      wrap="nowrap"
      align="center"
      pl={10}
      pr={6}
      py={4}
      style={{
        borderRadius: 999,
        background: 'var(--mantine-color-dark-6)',
        border: '1px solid var(--mantine-color-dark-4)',
      }}
    >
      <Tooltip
        label={isConnected ? 'Realtime sync active' : 'Realtime sync offline'}
        withArrow
      >
        <Box pos="relative" style={{ display: 'inline-flex' }}>
          {isConnected ? (
            <>
              <IconBroadcast
                size={18}
                color="var(--mantine-color-green-4)"
                stroke={1.8}
              />
              <Box
                pos="absolute"
                style={{
                  bottom: -1,
                  right: -1,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--mantine-color-green-5)',
                  border: '1.5px solid var(--mantine-color-dark-6)',
                  boxShadow: '0 0 6px var(--mantine-color-green-5)',
                }}
              />
            </>
          ) : (
            <IconBroadcastOff
              size={18}
              color="var(--mantine-color-gray-6)"
              stroke={1.8}
            />
          )}
        </Box>
      </Tooltip>
      {peers.length > 0 && <OnlinePeers />}
    </Group>
  );
}
