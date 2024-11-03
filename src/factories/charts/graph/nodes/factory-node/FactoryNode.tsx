import type { Factory } from '@/factories/Factory';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { InvisibleHandles } from '@/solver/layout/rendering/InvisibleHandles';
import { Box, Group, Stack, Text } from '@mantine/core';
import { IconHelpHexagon } from '@tabler/icons-react';
import type { NodeProps } from '@xyflow/react';
import { memo, useMemo } from 'react';

export interface IFactoryNodeData {
  label: string;
  factory: Factory;
  [key: string]: unknown;
}

export type IFactoryNodeProps = NodeProps & {
  data: IFactoryNodeData;
  type: 'Factory';
};

export const FactoryNode = memo((props: IFactoryNodeProps) => {
  const { data } = props;
  const { factory } = data;

  const outputs = useMemo(() => {
    return (
      factory.outputs
        ?.filter(o => o.resource != null)
        .map(o => AllFactoryItemsMap[o.resource!]) ?? []
    );
  }, [factory.outputs]);

  return (
    <Box
      p="sm"
      style={{
        borderRadius: 4,
        border: props.selected
          ? '1px solid var(--mantine-color-gray-3)'
          : '1px solid transparent',
      }}
      bg={'dark.4'}
    >
      <Group gap="sm">
        {factory.outputs?.[0]?.resource ? (
          <FactoryItemImage
            size={32}
            highRes
            id={factory.outputs?.[0].resource}
          />
        ) : (
          <IconHelpHexagon size={32} />
        )}
        <Stack gap={2} align="center">
          <Group gap={2}>
            <Text size="sm">{factory.name ?? 'Factory'}</Text>
          </Group>
          <Text size="xs">
            <Stack gap={1} align="center">
              {outputs.map(output => (
                <Text key={output.id} size="xs">
                  {output.name}
                </Text>
              ))}
            </Stack>
          </Text>
        </Stack>
      </Group>

      <InvisibleHandles />
    </Box>
  );
});
