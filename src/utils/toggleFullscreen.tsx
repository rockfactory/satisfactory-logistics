import React from 'react';

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
    console.error('Error toggling fullscreen mode:', error);
  }
}
