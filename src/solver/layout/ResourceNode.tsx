import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { Box, Group, Stack, Text } from '@mantine/core';
import { NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { RepeatingNumber } from '../../core/intl/NumberFormatter';
import { FactoryItem } from '../../recipes/FactoryItem';
import { InvisibleHandles } from './InvisibleHandles';

export interface IResourceNodeData {
  resource: FactoryItem;
  value: number;
  [key: string]: unknown;
}

export type IResourceNodeProps = NodeProps & {
  data: IResourceNodeData;
  type: 'Resource';
};

export const ResourceNode = memo((props: IResourceNodeProps) => {
  const { resource, value } = props.data;
  return (
    <Box p="sm" style={{ borderRadius: 4 }} bg="blue.8">
      <Group gap="xs">
        <FactoryItemImage id={resource.id} size={32} />
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
