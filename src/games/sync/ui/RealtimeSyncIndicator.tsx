import {
  Box,
  Button,
  Divider,
  Group,
  HoverCard,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBroadcast,
  IconBroadcastOff,
  IconCloudCheck,
  IconCloudOff,
  IconCloudUpload,
  IconDeviceFloppy,
  IconLogin2,
} from '@tabler/icons-react';
import cx from 'clsx';
import { type CSSProperties, type ReactNode, useMemo } from 'react';
import { useSession } from '@/auth/authSelectors';
import { LoginModal } from '@/auth/LoginModal';
import { useStore } from '@/core/zustand';
import { useGameSaveInfo } from '@/games/save/useGameSaveInfo';
import { useIsOnline } from '@/pwa/useNetworkStatus';
import {
  type PeerInfo,
  useAllPeers,
  useHttpOtherSendersCount,
} from '../peersSlice';
import { DEVICE_NAME, SENDER_ID } from '../realtimeSyncTypes';
import { triggerImmediatePresencePoll } from '../useGamePresence';
import { OnlinePeersList } from './OnlinePeersList';
import { PeerAvatar } from './PeerAvatar';
import classes from './RealtimeSyncIndicator.module.css';

export function RealtimeSyncIndicator() {
  const isConnected = useStore(s => s.gameSave.isRealtimeSyncConnected);
  const peers = useAllPeers();
  const session = useSession();
  const saveInfo = useGameSaveInfo();
  const isOnline = useIsOnline();
  const httpOtherSendersCount = useHttpOtherSendersCount();
  const [loginOpened, loginHandlers] = useDisclosure(false);

  const isLoggedOut = !session;
  // "Standby": logged in, no other users detected via HTTP polling, so the
  // websocket is intentionally not opened to conserve Supabase realtime slots.
  // Distinct from "Realtime sync offline" (transient error/reconnect).
  const isStandby =
    isOnline && !isLoggedOut && !isConnected && httpOtherSendersCount === 0;

  // In standby mode the websocket is closed, so the peers slice is empty —
  // but the user is still "present" in the logical sense. Inject a synthetic
  // self peer so the pill keeps showing their avatar (signals "all good,
  // you're just alone" instead of "something's missing").
  const selfPeer = useMemo<PeerInfo | null>(() => {
    if (!session) return null;
    const user = session.user;
    return {
      senderId: SENDER_ID,
      userId: user.id,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
      displayName:
        user.user_metadata?.full_name ?? user.user_metadata?.name ?? 'Unknown',
      deviceName: DEVICE_NAME,
      factoryId: null,
    };
  }, [session]);

  const displayPeers = useMemo<PeerInfo[]>(() => {
    if (peers.length > 0) return peers;
    if (isStandby && selfPeer) return [selfPeer];
    return [];
  }, [peers, isStandby, selfPeer]);

  const deviceCountByUser = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of displayPeers) {
      map.set(p.userId, (map.get(p.userId) ?? 0) + 1);
    }
    return map;
  }, [displayPeers]);

  const hasPeers = peers.length > 0;
  const hasDisplayPeers = displayPeers.length > 0;

  const statusTitle = !isOnline
    ? 'Offline'
    : isConnected
      ? 'Realtime sync active'
      : isLoggedOut
        ? 'Cloud sync off'
        : isStandby
          ? 'Realtime sync ready'
          : 'Realtime sync offline';

  const ariaLabel = !isOnline
    ? 'Offline. Changes are saved on this device.'
    : isConnected
      ? 'Realtime sync active'
      : isLoggedOut
        ? 'Log in to enable realtime sync'
        : isStandby
          ? 'Realtime sync ready. Will resume automatically when another user joins.'
          : 'Realtime sync offline';

  const pillLabel = !isOnline
    ? 'Offline'
    : isLoggedOut
      ? 'Log in'
      : isStandby
        ? null
        : !isConnected
          ? 'Offline'
          : null;

  const savedView = useMemo((): {
    icon: ReactNode;
    label: string;
    detail?: string;
    tooltip?: string;
  } => {
    switch (saveInfo.kind) {
      case 'local-only':
        return {
          icon: (
            <IconDeviceFloppy
              size={14}
              color="var(--mantine-color-gray-5)"
              stroke={1.8}
            />
          ),
          label: 'Saved on this device',
          detail: 'Log in to back up to the cloud.',
        };
      case 'saving':
        return {
          icon: (
            <IconCloudUpload
              size={14}
              color="var(--mantine-color-blue-4)"
              stroke={1.8}
            />
          ),
          label: 'Saving to cloud…',
        };
      case 'cloud-saved':
        return {
          icon: (
            <IconCloudCheck
              size={14}
              color="var(--mantine-color-green-4)"
              stroke={1.8}
            />
          ),
          label: 'All changes saved to cloud',
          tooltip: `Last save: ${saveInfo.full} (${saveInfo.relative})`,
        };
      case 'cloud-dirty':
        return {
          icon: (
            <IconCloudUpload
              size={14}
              color="var(--mantine-color-yellow-5)"
              stroke={1.8}
            />
          ),
          label: 'Unsaved changes',
          detail: 'Your edits will be saved to the cloud shortly.',
          tooltip: saveInfo.full
            ? `Last save: ${saveInfo.full} (${saveInfo.relative})`
            : undefined,
        };
      case 'cloud-pending':
        return {
          icon: (
            <IconCloudOff
              size={14}
              color="var(--mantine-color-yellow-5)"
              stroke={1.8}
            />
          ),
          label: 'Not yet saved to cloud',
          detail: 'Your game is kept safe on this device.',
        };
    }
  }, [saveInfo]);

  const canOpenLogin = isLoggedOut && isOnline;

  const pill = (
    <UnstyledButton
      data-tutorial-id="realtime-sync-indicator"
      className={cx(classes.pill, {
        [classes.pillClickable]: canOpenLogin,
      })}
      aria-label={ariaLabel}
      onClick={canOpenLogin ? loginHandlers.open : undefined}
    >
      <Box className={classes.statusIconWrap}>
        {!isOnline ? (
          <IconCloudOff
            size={18}
            color="var(--mantine-color-gray-6)"
            stroke={1.8}
          />
        ) : isConnected ? (
          <>
            <IconBroadcast
              size={18}
              color="var(--mantine-color-green-4)"
              stroke={1.8}
            />
            <Box className={classes.statusDot} />
          </>
        ) : isStandby ? (
          <IconBroadcast
            size={18}
            color="var(--mantine-color-green-4)"
            stroke={1.8}
          />
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
      {hasDisplayPeers && (
        <Box className={classes.avatarStack}>
          {displayPeers.map((peer, idx) => (
            <Box
              key={peer.senderId}
              className={classes.avatarStackItem}
              style={{ '--peer-z': displayPeers.length - idx } as CSSProperties}
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
        onOpen={triggerImmediatePresencePoll}
      >
        <HoverCard.Target>{pill}</HoverCard.Target>
        <HoverCard.Dropdown p="sm" maw={260}>
          <Stack gap={8}>
            <Group gap={6} align="center" wrap="nowrap">
              {!isOnline ? (
                <IconCloudOff
                  size={14}
                  color="var(--mantine-color-gray-6)"
                  stroke={1.8}
                />
              ) : isConnected ? (
                <IconBroadcast
                  size={14}
                  color="var(--mantine-color-green-4)"
                  stroke={1.8}
                />
              ) : isStandby ? (
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
                    {peers.length} online
                  </Text>
                )}
              </Text>
            </Group>
            {!isOnline && (
              <Text size="xs" c="dimmed" lh={1.4}>
                Your changes stay on this device and will sync when you're back
                online.
              </Text>
            )}
            {isStandby && (
              <Text size="xs" c="dimmed" lh={1.4}>
                No one else is here right now. Realtime sync resumes
                automatically when another user joins this game.
              </Text>
            )}
            <Group gap={6} align="center" wrap="nowrap">
              {savedView.icon}
              {savedView.tooltip ? (
                <Tooltip label={savedView.tooltip} withArrow>
                  <Text size="xs" c="dimmed" lh={1.4}>
                    {savedView.label}
                  </Text>
                </Tooltip>
              ) : (
                <Text size="xs" c="dimmed" lh={1.4}>
                  {savedView.label}
                </Text>
              )}
            </Group>
            {savedView.detail && (
              <Text size="xs" c="dimmed" lh={1.4}>
                {savedView.detail}
              </Text>
            )}
            {isLoggedOut && isOnline && (
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
