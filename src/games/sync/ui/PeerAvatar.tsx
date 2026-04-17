import { Avatar, Box, Tooltip } from '@mantine/core';
import type { CSSProperties } from 'react';
import type { PeerInfo } from '../peersSlice';
import { SENDER_ID } from '../realtimeSyncTypes';
import { DeviceIdenticon } from './DeviceIdenticon';
import classes from './PeerAvatar.module.css';

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
        className={classes.wrap}
        style={
          {
            '--peer-avatar-size': `${size}px`,
            '--peer-avatar-badge-size': `${badgeSize}px`,
          } as CSSProperties
        }
      >
        {avatar}
        <Box className={classes.badge}>
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
    <Tooltip label={tooltipLabel} withArrow>
      {content}
    </Tooltip>
  );
}
