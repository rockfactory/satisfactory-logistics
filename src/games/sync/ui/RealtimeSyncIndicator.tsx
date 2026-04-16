import {
  Box,
  Button,
  Divider,
  Group,
  HoverCard,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBroadcast,
  IconBroadcastOff,
  IconLogin2,
} from '@tabler/icons-react';
import cx from 'clsx';
import { type CSSProperties, useMemo } from 'react';
import { useSession } from '@/auth/authSelectors';
import { LoginModal } from '@/auth/LoginModal';
import { useStore } from '@/core/zustand';
import { useAllPeers } from '../peersSlice';
import { OnlinePeersList } from './OnlinePeersList';
import { PeerAvatar } from './PeerAvatar';
import classes from './RealtimeSyncIndicator.module.css';

export function RealtimeSyncIndicator() {
  const isConnected = useStore(s => s.gameSave.isRealtimeSyncConnected);
  const peers = useAllPeers();
  const session = useSession();
  const [loginOpened, loginHandlers] = useDisclosure(false);

  const deviceCountByUser = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of peers) {
      map.set(p.userId, (map.get(p.userId) ?? 0) + 1);
    }
    return map;
  }, [peers]);

  const hasPeers = peers.length > 0;
  const isLoggedOut = !session;

  const statusTitle = isConnected
    ? 'Realtime sync active'
    : isLoggedOut
      ? 'Cloud sync off'
      : 'Realtime sync offline';

  const ariaLabel = isConnected
    ? 'Realtime sync active'
    : isLoggedOut
      ? 'Log in to enable realtime sync'
      : 'Realtime sync offline';

  const pillLabel = isLoggedOut ? 'Log in' : !isConnected ? 'Offline' : null;

  const pill = (
    <UnstyledButton
      data-tutorial-id="realtime-sync-indicator"
      className={cx(classes.pill, {
        [classes.pillClickable]: isLoggedOut,
      })}
      aria-label={ariaLabel}
      onClick={isLoggedOut ? loginHandlers.open : undefined}
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
      {pillLabel && (
        <Text size="xs" fw={500} c="dimmed" className={classes.pillLabel}>
          {pillLabel}
        </Text>
      )}
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
                showDeviceBadge={(deviceCountByUser.get(peer.userId) ?? 0) > 1}
              />
            </Box>
          ))}
        </Box>
      )}
    </UnstyledButton>
  );

  return (
    <>
      <HoverCard
        position="bottom-end"
        withArrow
        shadow="md"
        openDelay={100}
        closeDelay={150}
        withinPortal
      >
        <HoverCard.Target>{pill}</HoverCard.Target>
        <HoverCard.Dropdown p="sm" maw={240}>
          <Stack gap={8}>
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
                {statusTitle}
                {hasPeers && (
                  <Text span size="sm" c="dimmed" fw={400}>
                    {' · '}
                    {peers.length} connected
                  </Text>
                )}
              </Text>
            </Group>
            {isLoggedOut && (
              <>
                <Text size="xs" c="dimmed" lh={1.4}>
                  Log in to enable cloud save, sync across devices, and sharing
                  with friends.
                </Text>
                <Button
                  size="xs"
                  variant="light"
                  color="blue"
                  leftSection={<IconLogin2 size={14} />}
                  onClick={loginHandlers.open}
                  fullWidth
                >
                  Log in
                </Button>
              </>
            )}
            {hasPeers && (
              <>
                <Divider />
                <OnlinePeersList />
              </>
            )}
          </Stack>
        </HoverCard.Dropdown>
      </HoverCard>
      <LoginModal opened={loginOpened} close={loginHandlers.close} />
    </>
  );
}
