import { Avatar, Box, Divider, Group, Stack, Text } from '@mantine/core';
import { IconCircleFilled } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useAllPeers } from '../peersSlice';
import { SENDER_ID } from '../realtimeSyncTypes';
import { DeviceIdenticon } from './DeviceIdenticon';
import classes from './OnlinePeersList.module.css';

const IDENTICON_SIZE = 14;

export function OnlinePeersList() {
  const peers = useAllPeers();

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

  return (
    <Stack gap="xs" miw={220}>
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
                <Box className={classes.identiconBadge}>
                  <DeviceIdenticon
                    seed={device.deviceName}
                    size={IDENTICON_SIZE}
                  />
                </Box>
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
  );
}
