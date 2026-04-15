import {
  Avatar,
  Box,
  Divider,
  Group,
  Popover,
  Stack,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCircleFilled } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useAllPeers } from '../peersSlice';
import { SENDER_ID } from '../realtimeSyncTypes';
import { DeviceIdenticon } from './DeviceIdenticon';
import { PeerAvatar } from './PeerAvatar';

export function OnlinePeers() {
  const peers = useAllPeers();
  const [opened, { toggle, close }] = useDisclosure(false);

  const deviceCountByUser = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of peers) {
      map.set(p.userId, (map.get(p.userId) ?? 0) + 1);
    }
    return map;
  }, [peers]);

  const leaderSenderId = useMemo(() => {
    if (peers.length === 0) return null;
    return [...peers.map(p => p.senderId)].sort()[0];
  }, [peers]);

  const groupedByUser = useMemo(() => {
    const groups = new Map<
      string,
      {
        userId: string;
        displayName: string;
        avatarUrl: string | null;
        devices: typeof peers;
      }
    >();
    for (const p of peers) {
      const existing = groups.get(p.userId);
      if (existing) {
        existing.devices.push(p);
      } else {
        groups.set(p.userId, {
          userId: p.userId,
          displayName: p.displayName,
          avatarUrl: p.avatarUrl,
          devices: [p],
        });
      }
    }
    return Array.from(groups.values());
  }, [peers]);

  if (peers.length === 0) return null;

  return (
    <Popover
      opened={opened}
      onClose={close}
      position="bottom-end"
      withArrow
      shadow="md"
    >
      <Popover.Target>
        <Box
          onClick={toggle}
          style={{
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          {peers.map((peer, idx) => (
            <Box
              key={peer.senderId}
              style={{
                marginLeft: idx === 0 ? 0 : -10,
                zIndex: peers.length - idx,
              }}
            >
              <PeerAvatar
                peer={peer}
                size={26}
                showDeviceBadge={(deviceCountByUser.get(peer.userId) ?? 0) > 1}
              />
            </Box>
          ))}
        </Box>
      </Popover.Target>
      <Popover.Dropdown p="sm">
        <Stack gap="xs" miw={220}>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase">
            Connected ({peers.length})
          </Text>
          {groupedByUser.map((group, idx) => (
            <Box key={group.userId || group.displayName}>
              {idx > 0 && <Divider mb="xs" />}
              <Group gap="xs" wrap="nowrap" mb={4}>
                <Avatar src={group.avatarUrl} size={22} radius="xl">
                  {group.displayName.charAt(0).toUpperCase()}
                </Avatar>
                <Text size="sm" fw={500}>
                  {group.displayName}
                  {group.devices.some(d => d.senderId === SENDER_ID) && (
                    <Text span size="xs" c="dimmed">
                      {' '}
                      (you)
                    </Text>
                  )}
                </Text>
              </Group>
              <Stack gap={4} pl={30}>
                {group.devices.map(device => (
                  <Group key={device.senderId} gap={6} wrap="nowrap">
                    <DeviceIdenticon seed={device.deviceName} size={12} />
                    <Text size="xs" c="dimmed">
                      {device.deviceName || 'Unknown device'}
                    </Text>
                    {device.senderId === leaderSenderId && (
                      <IconCircleFilled
                        size={8}
                        color="var(--mantine-color-green-5)"
                        title="Leader"
                      />
                    )}
                  </Group>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
