import {
  Box,
  Divider,
  Group,
  HoverCard,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { IconBroadcast, IconBroadcastOff } from '@tabler/icons-react';
import { type CSSProperties, useMemo } from 'react';
import { useStore } from '@/core/zustand';
import { useAllPeers } from '../peersSlice';
import { OnlinePeersList } from './OnlinePeersList';
import { PeerAvatar } from './PeerAvatar';
import classes from './RealtimeSyncIndicator.module.css';

export function RealtimeSyncIndicator() {
  const isConnected = useStore(s => s.gameSave.isRealtimeSyncConnected);
  const peers = useAllPeers();

  const deviceCountByUser = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of peers) {
      map.set(p.userId, (map.get(p.userId) ?? 0) + 1);
    }
    return map;
  }, [peers]);

  if (!isConnected && peers.length === 0) return null;

  const hasPeers = peers.length > 0;

  return (
    <HoverCard
      position="bottom-end"
      withArrow
      shadow="md"
      openDelay={100}
      closeDelay={150}
      withinPortal
    >
      <HoverCard.Target>
        <UnstyledButton
          className={classes.pill}
          aria-label={
            isConnected ? 'Realtime sync active' : 'Realtime sync offline'
          }
        >
          <Box className={classes.statusIconWrap}>
            {isConnected ? (
              <>
                <IconBroadcast
                  size={18}
                  color="var(--mantine-color-green-4)"
                  stroke={1.8}
                />
                <Box className={classes.statusDot} />
              </>
            ) : (
              <IconBroadcastOff
                size={18}
                color="var(--mantine-color-gray-6)"
                stroke={1.8}
              />
            )}
          </Box>
          {hasPeers && (
            <Box className={classes.avatarStack}>
              {peers.map((peer, idx) => (
                <Box
                  key={peer.senderId}
                  className={classes.avatarStackItem}
                  style={{ '--peer-z': peers.length - idx } as CSSProperties}
                >
                  <PeerAvatar
                    peer={peer}
                    size={26}
                    withTooltip={false}
                    showDeviceBadge={
                      (deviceCountByUser.get(peer.userId) ?? 0) > 1
                    }
                  />
                </Box>
              ))}
            </Box>
          )}
        </UnstyledButton>
      </HoverCard.Target>
      <HoverCard.Dropdown p="sm">
        <Stack gap="xs">
          <Group gap={6} align="center" wrap="nowrap">
            {isConnected ? (
              <IconBroadcast
                size={14}
                color="var(--mantine-color-green-4)"
                stroke={1.8}
              />
            ) : (
              <IconBroadcastOff
                size={14}
                color="var(--mantine-color-gray-6)"
                stroke={1.8}
              />
            )}
            <Text size="sm" fw={500}>
              {isConnected ? 'Realtime sync active' : 'Realtime sync offline'}
              {hasPeers && (
                <Text span size="sm" c="dimmed" fw={400}>
                  {' · '}
                  {peers.length} connected
                </Text>
              )}
            </Text>
          </Group>
          {hasPeers && (
            <>
              <Divider />
              <OnlinePeersList />
            </>
          )}
        </Stack>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}
