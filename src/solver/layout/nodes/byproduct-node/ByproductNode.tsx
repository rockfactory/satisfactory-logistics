import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import type { FactoryItem } from '@/recipes/FactoryItem';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { Box, Group, Stack, Text } from '@mantine/core';
import { NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { InvisibleHandles } from '../../rendering/InvisibleHandles';

export interface IByproductNodeData {
  resource: FactoryItem;
  value: number;
  [key: string]: unknown;
}

export type IByproductNodeProps = NodeProps & {
  data: IByproductNodeData;
  type: 'Byproduct';
};

export const ByproductNode = memo((props: IByproductNodeProps) => {
  const { resource, value } = props.data;
  return (
    <Box p="sm" style={{ borderRadius: 4 }} bg="teal.9">
      <Group gap="xs">
        <FactoryItemImage id={resource.id} size={32} highRes />
        <Stack gap={2} align="center">
          <Group gap="xs">
            <Text size="sm">{resource.displayName}</Text>
          </Group>
          <Text size="xs">
            <RepeatingNumber value={value} />
            /min
          </Text>
        </Stack>
      </Group>

      <InvisibleHandles />
      {/* <Handle type="source" position={Position.Right} id="source-right" />
      <Handle type="target" position={Position.Left} id="target-left" /> */}
    </Box>
  );
});
