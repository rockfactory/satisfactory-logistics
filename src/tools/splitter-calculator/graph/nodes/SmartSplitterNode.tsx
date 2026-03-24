import { Box, Group, Text } from '@mantine/core';
import { IconAdjustments } from '@tabler/icons-react';
import type { NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { InvisibleHandles } from '@/solver/layout/rendering/InvisibleHandles';

export interface ISmartSplitterNodeData {
  holding: number;
  label?: string;
  [key: string]: unknown;
}

export const SmartSplitterNode = memo((props: NodeProps) => {
  const data = props.data as ISmartSplitterNodeData;
  return (
    <Box
      p="xs"
      style={{
        borderRadius: 4,
        border: props.selected
          ? '1px solid var(--mantine-color-yellow-5)'
          : '1px solid var(--mantine-color-orange-8)',
      }}
      bg="orange.9"
    >
      <Group gap="xs">
        <IconAdjustments size={20} color="var(--mantine-color-yellow-3)" />
        <Text size="xs" c="yellow.2">
          Smart Splitter
        </Text>
      </Group>
      <InvisibleHandles />
    </Box>
  );
});
