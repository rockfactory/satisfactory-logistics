import { type Path, setByPath } from '@clickbar/dot-diver';
import { Card, Flex, Group, Stack, Text } from '@mantine/core';
import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/core/zustand';
import { ProgressChip } from '@/factories/components/ProgressChip';
import type { Factory } from '@/factories/Factory';
import { useIsFactoryVisible } from '@/factories/useIsFactoryVisible';
import { FactoryPeers } from '@/games/sync/FactoryPeers';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import classes from './FactoryGridCard.module.css';

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
    <Card key={id} withBorder component={Link} to={id} className={classes.card}>
      <Group justify="space-between" align="center" wrap="nowrap">
        <Stack
          justify="space-between"
          align="stretch"
          className={classes.cardContent}
        >
          <Group gap="xs" wrap="nowrap">
            <Text fw={500} size="lg">
              {factory.name ?? 'Unnamed'}
            </Text>
            <FactoryPeers factoryId={id} />
          </Group>
          <Flex
            align="center"
            wrap="nowrap"
            gap="sm"
            className={classes.outputsList}
          >
            {factory.outputs.map((output, outputIndex) => (
              <Group gap={6} wrap={'nowrap'} key={outputIndex}>
                <FactoryItemImage id={output.resource} size={24} />
                <Text size="xs">&times;</Text>
                <Text size="xs">{output.amount}</Text>
              </Group>
            ))}
          </Flex>
        </Stack>
        {showProgressStatus && (
          <ProgressChip
            status={factory.progress ?? undefined}
            size="md"
            variant="light"
            className={classes.progressChip}
          />
        )}
      </Group>
    </Card>
  );
}
