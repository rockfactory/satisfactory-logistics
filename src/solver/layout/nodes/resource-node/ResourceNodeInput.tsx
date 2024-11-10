import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import { FactoryInputIcon } from '@/factories/components/peek/icons/OutputInputIcons';
import { BaseFactoryUsage } from '@/factories/components/usage/FactoryUsage';
import { WORLD_SOURCE_ID } from '@/factories/Factory';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { Badge, Box, CloseButton, Group, Text, Title } from '@mantine/core';
import { IconBuildingFactory2, IconWorld } from '@tabler/icons-react';
import { useReactFlow } from '@xyflow/react';
import type { IResourceNodeData } from './ResourceNode';

export interface IResourceNodeInputProps {
  selected: boolean | undefined;
  id: string;
  data: IResourceNodeData;
  sourceFactory?:
    | typeof WORLD_SOURCE_ID
    | { name?: string | null; outputAmount?: number | null };
}

export function ResourceNodeInput(props: IResourceNodeInputProps) {
  const {
    selected,
    id,
    data: { isRaw, input, resource, value },
    sourceFactory,
  } = props;

  const { updateNode } = useReactFlow();

  // We show this component only for factory inputs
  if (isRaw) return null;

  return (
    <Box
      p="sm"
      bg="dark.5"
      style={{
        borderRadius: '4px 0 0 0',
      }}
    >
      <Group gap="sm" justify="space-between" align="flex-start">
        <Title order={5} mb="xs">
          <Group gap={4} component="span" align="center">
            <Badge radius={2} color="blue.6" variant="filled">
              Input
            </Badge>
            {sourceFactory === WORLD_SOURCE_ID ? (
              <IconWorld size={16} />
            ) : (
              <IconBuildingFactory2 size={16} />
            )}
            {sourceFactory === WORLD_SOURCE_ID
              ? 'World'
              : (sourceFactory?.name ?? 'Unknown Factory')}
          </Group>
        </Title>
        {props.selected && (
          <CloseButton
            size="sm"
            onClick={() => {
              updateNode(props.id, { selected: false });
            }}
          />
        )}
      </Group>

      <Text size="sm">
        <Group gap="md">
          <Group gap={4} align="center">
            <FactoryInputIcon size={16} />
            <RepeatingNumber value={value ?? 0} />
            /min
          </Group>
          <Group gap={4} align="center">
            <FactoryItemImage id={resource.id} size={16} highRes />
            {resource.displayName}
          </Group>
          {sourceFactory !== WORLD_SOURCE_ID && (
            <Group gap={4} align="center">
              <span>Usage</span>
              <BaseFactoryUsage
                percentage={value / (sourceFactory?.outputAmount ?? 0)}
              />
            </Group>
          )}
        </Group>
      </Text>
    </Box>
  );
}
