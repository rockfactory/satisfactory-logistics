import { type Path, setByPath } from '@clickbar/dot-diver';
import { Card, Flex, Group, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/core/zustand';
import { ProgressChip } from '@/factories/components/ProgressChip';
import { useFactoryHasOverusedInput } from '@/factories/components/usage/useOutputUsage';
import type { Factory } from '@/factories/Factory';
import { FactoryActionsMenu } from '@/factories/list/FactoryActionsMenu';
import { FactoryOutputChip } from '@/factories/list/FactoryOutputChip';
import { useIsFactoryVisible } from '@/factories/useIsFactoryVisible';
import { FactoryPeers } from '@/games/sync/ui/FactoryPeers';
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
  const hasOverusedInput = useFactoryHasOverusedInput(id);

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
      <Stack gap="md">
        <Group gap="xs" wrap="nowrap">
          <Text fw={500} size="lg" c={hasOverusedInput ? 'red.6' : undefined}>
            {factory.name ?? 'Unnamed'}
          </Text>
          {hasOverusedInput && (
            <IconAlertTriangle
              size={18}
              color="var(--mantine-color-red-6)"
              aria-label="Overused input"
            >
              <title>One or more inputs are overused</title>
            </IconAlertTriangle>
          )}
          <FactoryPeers factoryId={id} />
        </Group>
        <Group justify="space-between" align="center" wrap="nowrap">
          <Flex
            align="center"
            wrap="nowrap"
            gap="xs"
            className={classes.outputsList}
          >
            {factory.outputs.map((output, outputIndex) => (
              <FactoryOutputChip
                key={outputIndex}
                factoryId={id}
                output={output}
                disabled={factory.progress === 'disabled'}
              />
            ))}
          </Flex>
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
      </Stack>
    </Card>
  );
}
