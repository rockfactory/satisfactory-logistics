import { type Path, setByPath } from '@clickbar/dot-diver';
import { Card, Flex, Group, Stack, Text } from '@mantine/core';
import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/core/zustand';
import { ProgressChip } from '@/factories/components/ProgressChip';
import type { Factory } from '@/factories/Factory';
import { FactoryActionsMenu } from '@/factories/list/FactoryActionsMenu';
import { useIsFactoryVisible } from '@/factories/useIsFactoryVisible';
import { FactoryPeers } from '@/games/sync/ui/FactoryPeers';
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
    <Card
      key={id}
      withBorder
      component={Link}
      to={id}
      className={classes.card}
      style={{ opacity: factory.progress === 'disabled' ? 0.55 : 1 }}
    >
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
        <Group gap={4} wrap="nowrap" className={classes.progressChip}>
          {showProgressStatus && (
            <ProgressChip
              status={factory.progress ?? undefined}
              size="md"
              variant="light"
            />
          )}
          {/* The card itself is a <Link>; stop propagation here so opening
              the menu and clicking its items don't navigate to the detail
              page. The Mantine menu still receives the click on its
              target via React's bubble phase before this handler runs. */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: pure event-stop wrapper, no semantic interaction */}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: pure event-stop wrapper, no semantic interaction */}
          <span
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onMouseDown={e => {
              e.stopPropagation();
            }}
          >
            <FactoryActionsMenu factoryId={id} showOpen />
          </span>
        </Group>
      </Group>
    </Card>
  );
}
