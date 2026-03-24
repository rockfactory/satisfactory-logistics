import { Box, Group, Text } from '@mantine/core';
import { IconArrowMerge } from '@tabler/icons-react';
import type { NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { InvisibleHandles } from '@/solver/layout/rendering/InvisibleHandles';

export const MergerNode = memo((props: NodeProps) => {
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
      <Group gap={4}>
        <IconArrowMerge size={16} color="var(--mantine-color-gray-4)" />
        <Text size="xs" c="dimmed">
          Merger
        </Text>
      </Group>
      <InvisibleHandles />
    </Box>
  );
});
