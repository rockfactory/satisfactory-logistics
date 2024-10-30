import React from 'react';

export function toogleFullscreen(ref: React.RefObject<HTMLDivElement>) {
  if (!ref.current) {
    return;
  }
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    ref.current.requestFullscreen();
  }
}
