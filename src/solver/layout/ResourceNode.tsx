import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { Box, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconTransformFilled } from '@tabler/icons-react';
import { NodeProps } from '@xyflow/react';
import { memo, useMemo } from 'react';
import { RepeatingNumber } from '../../core/intl/NumberFormatter';
import { FactoryItem } from '../../recipes/FactoryItem';
import { InvisibleHandles } from './InvisibleHandles';
import { useSolverSolution } from './solution-context/SolverSolutionContext';

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
  const { id } = props;
  const { resource, value } = props.data;

  const { solution } = useSolverSolution();

  // Checks if the resource has forced usage from the graph
  const hasForcedUsage = useMemo(() => {
    if (!solution.graph.hasNode(resource.id)) return false;

    const inbounds = Array.from(
      solution.graph.inboundNeighborEntries(resource.id),
    );
    return (
      inbounds.filter(
        node =>
          node.attributes.type === 'raw_input' && node.attributes.forceUsage,
      ).length > 0
    );
  }, [resource.id, solution.graph]);

  return (
    <Box p="sm" style={{ borderRadius: 4 }} bg="blue.8">
      <Group gap="xs">
        <Box pos="relative">
          {hasForcedUsage && (
            <div style={{ position: 'absolute', left: -6, bottom: -16 }}>
              <Tooltip label="Forced usage. Recipes chosen can be less resource-efficient due do this choice.">
                <IconTransformFilled size={16} />
              </Tooltip>
            </div>
          )}
          <FactoryItemImage id={resource.id} size={32} />
        </Box>
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
