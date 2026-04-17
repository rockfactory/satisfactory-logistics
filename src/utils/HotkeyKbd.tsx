import { Group, Kbd } from '@mantine/core';
import { useOs } from '@mantine/hooks';
import { Fragment } from 'react';

export type HotkeyToken = 'SystemCtrlOrCmd' | (string & {});

export interface HotkeyKbdProps {
  keys: HotkeyToken[];
  separator?: string;
}

function resolveKey(key: HotkeyToken, os: ReturnType<typeof useOs>): string {
  if (key === 'SystemCtrlOrCmd') return os === 'macos' ? '⌘' : 'Ctrl';
  return key;
}

export function HotkeyKbd({ keys, separator = '+' }: HotkeyKbdProps) {
  const os = useOs();
  return (
    <Group gap={4} align="center" wrap="nowrap" component="span">
      {keys.map((key, idx) => (
        <Fragment key={key}>
          {idx > 0 && <span style={{ lineHeight: 1 }}>{separator}</span>}
          <Kbd size="xs" style={{ lineHeight: 1 }}>
            {resolveKey(key, os)}
          </Kbd>
        </Fragment>
      ))}
    </Group>
  );
}
