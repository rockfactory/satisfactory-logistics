import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import type { FactoryOutput } from '@/factories/Factory';
import type { FactoryItem } from '@/recipes/FactoryItem';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import type { SolverNodeState } from '@/solver/store/Solver';
import { alpha, Box, Group, Stack, Text } from '@mantine/core';
import { NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { InvisibleHandles } from '../../rendering/InvisibleHandles';

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
  const { resource, value, output } = props.data;

  const isByproduct = output == null;

  // #975000
  return (
    <Box p="sm" style={{ borderRadius: 4 }} bg="teal.9">
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
  );
});
