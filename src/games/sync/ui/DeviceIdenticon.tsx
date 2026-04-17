import { minidenticon } from 'minidenticons';
import { useMemo } from 'react';

export interface DeviceIdenticonProps {
  seed: string;
  size?: number;
  saturation?: number;
  lightness?: number;
  title?: string;
}

export function DeviceIdenticon({
  seed,
  size = 12,
  saturation = 85,
  lightness = 55,
  title,
}: DeviceIdenticonProps) {
  const svg = useMemo(
    () => minidenticon(seed, saturation, lightness),
    [seed, saturation, lightness],
  );
  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  return (
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt={title ?? seed}
      title={title ?? seed}
      style={{ display: 'block' }}
    />
  );
}
