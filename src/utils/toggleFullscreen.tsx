import { notifications } from '@mantine/notifications';
import type React from 'react';

export function toggleFullscreen(ref: React.RefObject<HTMLDivElement>) {
  try {
    if (!ref.current) {
      return;
    }
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      ref.current.requestFullscreen();
    }
  } catch (error) {
    notifications.show({
      title: 'Fullscreen mode',
      message: 'Error toggling fullscreen mode',
      color: 'red',
    });
  }
}
