import { Box, Group, Stack, Text } from '@mantine/core';
import { IconTarget } from '@tabler/icons-react';
import type { NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import { InvisibleHandles } from '@/solver/layout/rendering/InvisibleHandles';

export interface IBeltTargetNodeData {
  rate: number;
  label?: string;
  smartRule?: string;
  [key: string]: unknown;
}

export const BeltTargetNode = memo((props: NodeProps) => {
  const data = props.data as IBeltTargetNodeData;

  const isLeftover = data.label?.startsWith('Leftover');

  const bgColor = isLeftover
    ? 'gray.7'
    : data.smartRule === 'overflow'
      ? 'orange.7'
      : data.smartRule === 'item_filter'
        ? 'yellow.8'
        : 'blue.7';

  return (
    <Box
      p="sm"
      style={{
        borderRadius: 4,
        border: props.selected
          ? '1px solid var(--mantine-color-gray-3)'
          : '1px solid transparent',
      }}
      bg={bgColor}
    >
      <Group gap="xs">
        <IconTarget size={24} />
        <Stack gap={2}>
          <Text size="sm" fw={500}>
            {data.label ?? 'Target'}
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
