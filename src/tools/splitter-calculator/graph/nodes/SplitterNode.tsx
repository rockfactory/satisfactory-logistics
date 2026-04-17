import { Box, Group, Stack, Text } from '@mantine/core';
import { IconArrowsSplit } from '@tabler/icons-react';
import type { NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { InvisibleHandles } from '@/solver/layout/rendering/InvisibleHandles';

function PortDot(props: { active: boolean; side: 'in' | 'out' }) {
  const activeColor =
    props.side === 'in'
      ? 'var(--mantine-color-teal-5)'
      : 'var(--mantine-color-blue-5)';
  return (
    <Box
      w={6}
      h={6}
      style={{
        borderRadius: '50%',
        backgroundColor: props.active
          ? activeColor
          : 'var(--mantine-color-dark-3)',
      }}
    />
  );
}

function PortDots(props: { used: number; total: number; side: 'in' | 'out' }) {
  return (
    <Group gap={3}>
      {props.total === 1 ? (
        <PortDot active={props.used >= 1} side={props.side} />
      ) : (
        <>
          <PortDot active={props.used >= 1} side={props.side} />
          <PortDot active={props.used >= 2} side={props.side} />
          <PortDot active={props.used >= 3} side={props.side} />
        </>
      )}
    </Group>
  );
}

export const SplitterNode = memo((props: NodeProps) => {
  const outputCount = (props.data.outputCount as number) ?? 0;
  const inputCount = (props.data.inputCount as number) ?? 0;

  return (
    <Box
      p="4px 8px"
      style={{
        borderRadius: 4,
        border: props.selected
          ? '1px solid var(--mantine-color-gray-3)'
          : '1px solid var(--mantine-color-dark-4)',
      }}
      bg="dark.6"
    >
      <Stack gap={2} align="center">
        <Group gap={4}>
          <IconArrowsSplit size={16} color="var(--mantine-color-gray-4)" />
          <Text size="xs" c="dimmed">
            Splitter
          </Text>
        </Group>
        <Group gap={6}>
          <PortDots used={inputCount} total={1} side="in" />
          <Text size="9px" c="dimmed">
            {inputCount} x {outputCount}
          </Text>
          <PortDots used={outputCount} total={3} side="out" />
        </Group>
      </Stack>
      <InvisibleHandles />
    </Box>
  );
});
