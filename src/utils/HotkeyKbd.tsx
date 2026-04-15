import { Group, Kbd } from '@mantine/core';
import { Fragment } from 'react';

export interface HotkeyKbdProps {
  keys: string[];
  separator?: string;
}

export function HotkeyKbd({ keys, separator = '+' }: HotkeyKbdProps) {
  return (
    <Group gap={4} align="center" wrap="nowrap" component="span">
      {keys.map((key, idx) => (
        <Fragment key={key}>
          {idx > 0 && <span style={{ lineHeight: 1 }}>{separator}</span>}
          <Kbd size="xs" style={{ lineHeight: 1 }}>
            {key}
          </Kbd>
        </Fragment>
      ))}
    </Group>
  );
}
