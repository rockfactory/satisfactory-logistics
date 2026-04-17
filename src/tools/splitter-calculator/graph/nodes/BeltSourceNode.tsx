import { Box, Group, Stack, Text } from '@mantine/core';
import { IconBoxSeam } from '@tabler/icons-react';
import type { NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import { InvisibleHandles } from '@/solver/layout/rendering/InvisibleHandles';

export interface IBeltSourceNodeData {
  rate: number;
  label?: string;
  [key: string]: unknown;
}

export const BeltSourceNode = memo((props: NodeProps) => {
  const data = props.data as IBeltSourceNodeData;
  return (
    <Box
      p="sm"
      style={{
        borderRadius: 4,
        border: props.selected
          ? '1px solid var(--mantine-color-gray-3)'
          : '1px solid transparent',
      }}
      bg="teal.8"
    >
      <Group gap="xs">
        <IconBoxSeam size={24} />
        <Stack gap={2}>
          <Text size="sm" fw={500}>
            {data.label ?? 'Source'}
          </Text>
          <Text size="xs">
            <RepeatingNumber value={data.rate} />
            /min
          </Text>
        </Stack>
      </Group>
      <InvisibleHandles />
    </Box>
  );
});
