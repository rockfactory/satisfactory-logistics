import { notifications } from '@mantine/notifications';
import { RefObject } from 'react';

export function toggleFullscreen(ref: RefObject<HTMLDivElement>) {
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
