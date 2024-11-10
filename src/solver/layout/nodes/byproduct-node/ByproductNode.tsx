import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import type { FactoryOutput } from '@/factories/Factory';
import type { FactoryItem } from '@/recipes/FactoryItem';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import type { SolverNodeState } from '@/solver/store/Solver';
import { alpha, Box, Flex, Group, Popover, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { InvisibleHandles } from '../../rendering/InvisibleHandles';
import { NodeActionsBox } from '../utils/NodeActionsBox';
import { ByproductNodeActions } from './ByproductNodeActions';

export type IByproductNodeData = {
  label: string;
  resource: FactoryItem;
  value: number;
  // Only set if the byproduct is required by the user
  output?: FactoryOutput;
  outputIndex?: number;

  state?: SolverNodeState;
};

export type IByproductNodeProps = NodeProps & {
  data: IByproductNodeData;
  type: 'Byproduct';
};

export const ByproductNode = memo((props: IByproductNodeProps) => {
  const { resource, value, output, outputIndex } = props.data;

  const isByproduct = output == null;

  const [isHovering, { close, open }] = useDisclosure(false);

  return (
    <Popover
      disabled={isByproduct}
      opened={(isHovering || props.selected) && !props.dragging}
      transitionProps={{}}
    >
      <Popover.Target>
        <Box
          p="sm"
          style={{ borderRadius: 4 }}
          bg="teal.9"
          onMouseEnter={open}
          onMouseLeave={close}
        >
          <Group gap="xs">
            <Box
              p="2"
              style={{ borderRadius: 32 }}
              bg={
                !isByproduct
                  ? 'transparent'
                  : alpha('var(--mantine-color-orange-4)', 0.5)
              }
            >
              <FactoryItemImage id={resource.id} size={32} highRes />
            </Box>
            <Stack gap={2} align="center">
              <Group gap="xs">
                <Text size="sm">
                  {isByproduct ? 'Byproduct: ' : ''}
                  {resource.displayName}
                </Text>
              </Group>
              <Text size="xs">
                <RepeatingNumber value={value} />
                /min
              </Text>
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
          <Stack gap={0}></Stack>
          <NodeActionsBox>
            {props.selected ? (
              <ByproductNodeActions id={props.id} data={props.data} />
            ) : (
              <Stack>
                <Text fs="italic" size="sm">
                  Click on the node to see available actions, like editing
                  amount.
                </Text>
              </Stack>
            )}
          </NodeActionsBox>
        </Flex>
      </Popover.Dropdown>
    </Popover>
  );
});
