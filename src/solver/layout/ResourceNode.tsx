import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { Box, Group, Popover, Stack, Text, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconTransformFilled } from '@tabler/icons-react';
import { NodeProps } from '@xyflow/react';
import { memo, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { RepeatingNumber } from '../../core/intl/NumberFormatter';
import { FactoryItem } from '../../recipes/FactoryItem';
import { InvisibleHandles } from './InvisibleHandles';
import { ResourceNodeExtractorDetail } from './resource-node/ResourceNodeExtractorDetail';
import { useSolverSolution } from './solution-context/SolverSolutionContext';

export interface IResourceNodeData {
  resource: FactoryItem;
  value: number;
  isRaw: boolean;
  [key: string]: unknown;
}

export type IResourceNodeProps = NodeProps & {
  data: IResourceNodeData;
  type: 'Resource';
};

export const ResourceNode = memo((props: IResourceNodeProps) => {
  const { id } = props;
  const { resource, value, isRaw } = props.data;

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

  const [isHovering, { close, open }] = useDisclosure(false);

  const solverId = useParams<{ id: string }>().id;

  return (
    <Popover
      opened={(isHovering || props.selected) && !props.dragging}
      transitionProps={{}}
    >
      <Popover.Target>
        <Box
          p="sm"
          style={{
            borderRadius: 4,
            border: props.selected
              ? '1px solid var(--mantine-color-gray-3)'
              : '1px solid transparent',
          }}
          bg="blue.8"
          onMouseEnter={open}
          onMouseLeave={close}
        >
          <Group gap="xs">
            <Box pos="relative">
              {hasForcedUsage && (
                <div style={{ position: 'absolute', left: -6, bottom: -16 }}>
                  <Tooltip label="Forced usage. Recipes chosen can be less resource-efficient due do this choice.">
                    <IconTransformFilled size={16} />
                  </Tooltip>
                </div>
              )}
              <FactoryItemImage id={resource.id} size={32} highRes />
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
      </Popover.Target>
      <Popover.Dropdown p={0}>
        {isRaw && (
          <ResourceNodeExtractorDetail
            id={props.id}
            solverId={solverId!}
            data={props.data}
          />
        )}
      </Popover.Dropdown>
    </Popover>
  );
});
