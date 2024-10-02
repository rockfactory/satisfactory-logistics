import { Box, Group, Image, Stack, Text } from '@mantine/core';
import { Handle, NodeProps, Position } from '@xyflow/react';
import { memo } from 'react';
import { FactoryItem } from '../../FactoryItem';

export type IResourceNodeProps = NodeProps & {
  data: any;
  type: any;
};

export const ResourceNode = memo((props: IResourceNodeProps) => {
  const resource: FactoryItem = props.data.resource;
  return (
    <Box p="sm" style={{ borderRadius: 4 }} bg="blue.8">
      <Group gap="sm">
        <Image w="48" h="48" src={resource.imagePath} />
        <Stack gap="xs" align="center">
          <Group gap="xs">{resource.displayName}</Group>
          <Text size="sm">{props.data.value}/min</Text>
        </Stack>
      </Group>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </Box>
  );
});
