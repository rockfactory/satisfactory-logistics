import { Path, setByPath } from '@clickbar/dot-diver';
import { Card, Flex, Group, Stack, Text } from '@mantine/core';
import * as React from 'react';
import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/core/zustand.ts';
import { Factory } from '@/factories/Factory.ts';
import { useIsFactoryVisible } from '@/factories/useIsFactoryVisible.tsx';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage.tsx';
import { ProgressChip } from '@/factories/components/ProgressChip.tsx';

export interface IFactoryGridCard {
  id: string;
  showProgressStatus?: boolean;
}

export function FactoryGridCard(props: IFactoryGridCard) {
  const { id, showProgressStatus = true } = props;
  const factory = useStore(state => state.factories.factories[id]);
  const updater = useCallback(
    (path: Path<Factory>, value: string | null | number) => {
      useStore
        .getState()
        .updateFactory(id, state => setByPath(state, path, value));
    },
    [id],
  );

  const isVisible = useIsFactoryVisible(id, true);

  if (!isVisible) return null;

  if (!factory) {
    console.error('Factory not found', id);
    return null;
  }

  return (
    <Card key={id} withBorder component={Link} to={id}>
      <Group justify="space-between" align="center" wrap="nowrap">
        <Stack justify="space-between" align="stretch">
          <Text fw={500} size="lg">
            {factory.name ?? 'Unnamed'}
          </Text>
          <Flex
            align="center"
            wrap={'nowrap'}
            gap="sm"
            style={{ textOverflow: 'ellipsis', minWidth: 0 }}
          >
            {factory.outputs.map(output => (
              <Group gap={6} wrap={'nowrap'}>
                <FactoryItemImage id={output.resource} size={24} />
                <Text size="xs">&times;</Text>
                <Text size="xs">{output.amount}</Text>
              </Group>
            ))}
          </Flex>
        </Stack>
        {showProgressStatus && (
          <ProgressChip status={factory.progress} size="md" variant="light" />
        )}
      </Group>
    </Card>
  );
}
