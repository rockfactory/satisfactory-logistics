import { Avatar, Box, Tooltip } from '@mantine/core';
import type { PeerInfo } from '../peersSlice';
import { SENDER_ID } from '../realtimeSyncTypes';
import { DeviceIdenticon } from './DeviceIdenticon';

export interface PeerAvatarProps {
  peer: PeerInfo;
  showDeviceBadge?: boolean;
  size?: number;
  withTooltip?: boolean;
}

export function PeerAvatar({
  peer,
  showDeviceBadge = false,
  size = 28,
  withTooltip = true,
}: PeerAvatarProps) {
  const isSelf = peer.senderId === SENDER_ID;
  const tooltipLabel = [
    peer.displayName + (isSelf ? ' (you)' : ''),
    peer.deviceName,
  ]
    .filter(Boolean)
    .join(' · ');

  const badgeSize = Math.max(16, Math.round(size * 0.7));

  const avatar = (
    <Avatar src={peer.avatarUrl} size={size} radius="xl">
      {peer.displayName.charAt(0).toUpperCase()}
    </Avatar>
  );

  const content =
    showDeviceBadge && peer.deviceName ? (
      <Box
        pos="relative"
        style={{
          display: 'inline-flex',
          width: size,
          height: size,
          verticalAlign: 'middle',
        }}
      >
        {avatar}
        <Box
          pos="absolute"
          style={{
            bottom: -2,
            right: -2,
            width: badgeSize,
            height: badgeSize,
            borderRadius: '50%',
            border: '2px solid var(--mantine-color-dark-7)',
            background: 'var(--mantine-color-dark-5)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <DeviceIdenticon
            seed={peer.deviceName}
            size={badgeSize - 4}
            title={peer.deviceName}
          />
        </Box>
      </Box>
    ) : (
      avatar
    );

  if (!withTooltip) return content;

  return (
    <Tooltip label={tooltipLabel} withArrow color="dark">
      {content}
    </Tooltip>
  );
}
