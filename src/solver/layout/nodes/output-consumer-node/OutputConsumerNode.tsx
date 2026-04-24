import {
  Anchor,
  Badge,
  Box,
  Flex,
  Group,
  Popover,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBuildingFactory2, IconExternalLink } from '@tabler/icons-react';
import type { NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { Link } from 'react-router-dom';
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

export type IOutputConsumerNodeData = {
  resource: FactoryItem;
  /** Solver-computed amount actually flowing to this consumer. */
  value: number;
  /** Amount the consumer factory has declared it needs. */
  consumerAmount: number;
  consumerFactoryId: string;
  consumerFactoryName?: string | null;
  consumerInputIndex: number;
  output?: FactoryOutput;
  outputIndex?: number;

  state?: SolverNodeState;
};

export type IOutputConsumerNodeProps = NodeProps & {
  data: IOutputConsumerNodeData;
  type: 'OutputConsumer';
};

export const OutputConsumerNode = memo((props: IOutputConsumerNodeProps) => {
  const { id } = props;
  const {
    resource,
    value,
    consumerAmount,
    consumerFactoryId,
    consumerFactoryName,
  } = props.data;

  const [isHovering, { close, open }] = useDisclosure(false);

  const highlight = useSolverHighlightOptional();
  const isPrimaryHighlighted = highlight?.highlightedNodeId === id;
  const isDimmed = useIsNodeHighlighted(id) === false;

  const factoryLabel = consumerFactoryName || 'Unknown Factory';

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
                : '1px solid transparent',
            opacity: isDimmed ? 0.25 : 1,
            transition: 'border-color 0.2s, opacity 0.2s',
          }}
          bg="blue.9"
          onMouseEnter={open}
          onMouseLeave={close}
        >
          <Group gap="xs">
            <FactoryItemImage id={resource.id} size={32} highRes />
            <Stack gap={2} align="center">
              <Group gap={4}>
                <Text size="sm">{factoryLabel}:</Text>
                <Text size="sm">{resource.displayName}</Text>
              </Group>
              <Group gap={4} align="center">
                <Tooltip label="Output to another factory">
                  <FactoryOutputIcon size={16} stroke={2} />
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
                <Badge radius={2} color="cyan.9" variant="filled">
                  Output
                </Badge>
                <IconBuildingFactory2 size={16} />
                <Anchor
                  component={Link}
                  to={`/factories/${consumerFactoryId}/calculator`}
                  c="gray"
                >
                  <Group gap={2}>
                    {factoryLabel}
                    <IconExternalLink size={12} />
                  </Group>
                </Anchor>
              </Group>
            </Title>

            <Text component="div" size="sm">
              <Group gap="md">
                <Group gap={4} align="center">
                  <FactoryOutputIcon size={16} />
                  <RepeatingNumber value={value} />
                  /min
                </Group>
                <Group gap={4} align="center">
                  <FactoryItemImage id={resource.id} size={16} highRes />
                  {resource.displayName}
                </Group>
                <Group gap={4} align="center">
                  <Text size="sm" c="dimmed">
                    Requested:
                  </Text>
                  <RepeatingNumber value={consumerAmount} />
                  /min
                </Group>
              </Group>
            </Text>
          </Box>
          <NodeActionsBox>
            <Stack>
              <Text fs="italic" size="sm">
                This factory supplies{' '}
                <Anchor
                  component={Link}
                  to={`/factories/${consumerFactoryId}/calculator`}
                >
                  {factoryLabel}
                </Anchor>
                . Edit the link from the consumer factory's inputs.
              </Text>
            </Stack>
          </NodeActionsBox>
        </Flex>
      </Popover.Dropdown>
    </Popover>
  );
});
