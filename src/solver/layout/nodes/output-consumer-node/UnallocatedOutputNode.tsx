import {
  Badge,
  Box,
  Divider,
  Flex,
  Group,
  Popover,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle } from '@tabler/icons-react';
import type { NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import { FactoryOutputIcon } from '@/factories/components/peek/icons/OutputInputIcons';
import type { FactoryOutput } from '@/factories/Factory';
import type { FactoryItem } from '@/recipes/FactoryItem';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import {
  useIsNodeHighlighted,
  useSolverHighlightOptional,
} from '@/solver/layout/highlight/SolverHighlightContext';
import { NodeActionsBox } from '@/solver/layout/nodes/utils/NodeActionsBox';
import { InvisibleHandles } from '@/solver/layout/rendering/InvisibleHandles';
import type { SolverNodeState } from '@/solver/store/Solver';
import { ShowOutputFactoriesNodesAction } from './ShowOutputFactoriesNodesAction';

export type IUnallocatedOutputNodeData = {
  resource: FactoryItem;
  /** Amount of this output not claimed by any downstream factory. */
  value: number;
  /** Total produced by this factory for this output. */
  totalProduced: number;
  /** Sum of declared consumer claims for this output. */
  totalAllocated: number;
  output?: FactoryOutput;
  outputIndex?: number;

  state?: SolverNodeState;
};

export type IUnallocatedOutputNodeProps = NodeProps & {
  data: IUnallocatedOutputNodeData;
  type: 'UnallocatedOutput';
};

export const UnallocatedOutputNode = memo(
  (props: IUnallocatedOutputNodeProps) => {
    const { id } = props;
    const { resource, value, totalProduced, totalAllocated } = props.data;

    const [isHovering, { close, open }] = useDisclosure(false);

    const highlight = useSolverHighlightOptional();
    const isPrimaryHighlighted = highlight?.highlightedNodeId === id;
    const isDimmed = useIsNodeHighlighted(id) === false;

    const allocatedPct =
      totalProduced > 0 ? (totalAllocated / totalProduced) * 100 : 0;

    return (
      <Popover
        opened={(isHovering || props.selected) && !props.dragging}
        transitionProps={{}}
        hideDetached={false}
      >
        <Popover.Target>
          <Box
            p="sm"
            style={{
              borderRadius: 4,
              border: props.selected
                ? '1px solid var(--mantine-color-gray-3)'
                : isPrimaryHighlighted
                  ? '1px solid var(--mantine-color-blue-4)'
                  : '1px dashed var(--mantine-color-gray-6)',
              opacity: isDimmed ? 0.25 : 1,
              transition: 'border-color 0.2s, opacity 0.2s',
            }}
            bg="dark.5"
            onMouseEnter={open}
            onMouseLeave={close}
          >
            <Group gap="xs">
              <Box style={{ opacity: 0.6 }}>
                <FactoryItemImage id={resource.id} size={32} highRes />
              </Box>
              <Stack gap={2} align="center">
                <Group gap={4}>
                  <Text size="sm" c="dimmed">
                    Unallocated:
                  </Text>
                  <Text size="sm">{resource.displayName}</Text>
                </Group>
                <Group gap={4} align="center">
                  <Tooltip label="Production with no declared consumer">
                    <IconAlertCircle size={14} stroke={2} />
                  </Tooltip>
                  <Text size="xs">
                    <RepeatingNumber value={value} />
                    /min
                  </Text>
                </Group>
              </Stack>
            </Group>

            <InvisibleHandles />
          </Box>
        </Popover.Target>
        <Popover.Dropdown p={0}>
          <Flex
            align="stretch"
            gap={0}
            direction={{
              base: 'column',
              sm: 'row',
            }}
          >
            <Box
              p="sm"
              bg="dark.5"
              style={{
                borderRadius: '4px 0 0 0',
              }}
            >
              <Title order={5} mb="xs">
                <Group gap={4} component="span" align="center">
                  <Badge radius={2} color="gray.7" variant="filled">
                    Unallocated
                  </Badge>
                  <FactoryItemImage id={resource.id} size={16} highRes />
                  {resource.displayName}
                </Group>
              </Title>

              <Text component="div" size="sm">
                <Stack gap={4}>
                  <Group gap={4} align="center">
                    <FactoryOutputIcon size={14} />
                    <Text size="sm" c="dimmed">
                      Produced:
                    </Text>
                    <RepeatingNumber value={totalProduced} />
                    /min
                  </Group>
                  <Group gap={4} align="center">
                    <Text size="sm" c="dimmed">
                      Allocated:
                    </Text>
                    <RepeatingNumber value={totalAllocated} />
                    /min ({allocatedPct.toFixed(0)}%)
                  </Group>
                  <Group gap={4} align="center">
                    <Text size="sm" c="dimmed">
                      Unallocated:
                    </Text>
                    <RepeatingNumber value={value} />
                    /min
                  </Group>
                </Stack>
              </Text>
            </Box>
            <NodeActionsBox>
              <Stack gap="sm">
                <Text fs="italic" size="xs" c="dimmed">
                  This much production has no downstream consumer factory
                  declared. Add an input pointing at this factory from another
                  factory to allocate it.
                </Text>
                <Divider />
                <ShowOutputFactoriesNodesAction />
              </Stack>
            </NodeActionsBox>
          </Flex>
        </Popover.Dropdown>
      </Popover>
    );
  },
);
