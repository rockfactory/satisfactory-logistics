import { type Path, setByPath } from '@clickbar/dot-diver';
import {
  ActionIcon,
  Card,
  Collapse,
  Group,
  Stack,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconCalculator } from '@tabler/icons-react';
import type * as React from 'react';
import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useFormOnChange } from '@/core/form/useFormOnChange';
import { useStore } from '@/core/zustand';
import { FactoryExpandActionIcon } from '@/factories/components/expand/FactoryExpandActionIcon';
import {
  FactoryInputIcon,
  FactoryOutputIcon,
} from '@/factories/components/peek/icons/OutputInputIcons';
import { useFactoryHasMissingInputs } from '@/factories/components/usage/useFactoryHasMissingInputs';
import type { Factory } from '@/factories/Factory';
import { FactoryInputRow } from '@/factories/inputs/input-row/FactoryInputRow';
import { FactoryOutputRow } from '@/factories/inputs/output-row/FactoryOutputRow';
import { FactoryActionsMenu } from '@/factories/list/FactoryActionsMenu';
import { useIsFactoryVisible } from '@/factories/useIsFactoryVisible';
import { useGameFactoryIsCollapsed } from '@/games/gamesSlice';
import { FactoryPeers } from '@/games/sync/ui/FactoryPeers';

export interface IFactoryRowProps {
  id: string;
  index: number;
}

export type FactoryChangeHandler = (
  id: string,
  path: string,
) => (
  value: string | null | number | React.ChangeEvent<HTMLInputElement>,
) => void;

export function FactoryRow(props: IFactoryRowProps) {
  const { id, index } = props;
  // const dispatch = useDispatch();
  const factory = useStore(state => state.factories.factories[id]);
  const updater = useCallback(
    (path: Path<Factory>, value: string | null | number) => {
      useStore
        .getState()
        .updateFactory(id, state => setByPath(state, path, value));
    },
    [id],
  );
  const onChangeHandler = useFormOnChange<Factory>(updater);

  const isVisible = useIsFactoryVisible(id, true);
  const isCollapsed = useGameFactoryIsCollapsed(id);
  const hasMissingInputs = useFactoryHasMissingInputs(id);
  if (!isVisible) return null;

  if (!factory) {
    console.error('Factory not found', id);
    return null;
  }

  return (
    <Card
      key={id}
      withBorder
      style={{ opacity: factory.progress === 'disabled' ? 0.55 : 1 }}
    >
      <Group gap="sm" align="flex-start" justify="space-between">
        <Group gap="sm" align="flex-start">
          <Group gap={4}>
            <FactoryExpandActionIcon
              isCollapsed={isCollapsed}
              factoryId={id}
              hasMissingInputs={hasMissingInputs}
            />
            <TextInput
              variant="unstyled"
              placeholder="Factory..."
              fw={'bold'}
              w={150}
              defaultValue={factory.name ?? ''}
              onChange={onChangeHandler('name')}
            />
            <FactoryPeers factoryId={id} />
          </Group>

          <Stack gap={'sm'}>
            {(factory.outputs ?? [{ resource: null, amount: null }]).map(
              (output, index) => (
                <FactoryOutputRow
                  key={index}
                  index={index}
                  output={output}
                  factoryId={factory.id}
                />
              ),
            )}
          </Stack>
        </Group>
        <Group align="flex-end" gap="xs">
          <Tooltip label="Add Input" position="top">
            <ActionIcon
              variant="light"
              color="blue"
              size="lg"
              onClick={() => useStore.getState().addFactoryInput(id)}
            >
              <FactoryInputIcon stroke={2} size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Add Output" position="top">
            <ActionIcon
              variant="filled"
              color="blue"
              size="lg"
              onClick={() => useStore.getState().addFactoryOutput(id)}
            >
              <FactoryOutputIcon stroke={2} size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Calculator" position="top">
            <ActionIcon
              component={Link}
              to={`/factories/${factory.id}/calculator`}
              variant="filled"
              color="cyan"
              size="lg"
            >
              <IconCalculator stroke={2} size={16} />
            </ActionIcon>
          </Tooltip>

          <FactoryActionsMenu factoryId={id} showOpen />
        </Group>
      </Group>
      {/* </Grid.Col> */}

      <Collapse
        mt="sm"
        ml="-12px"
        expanded={!!factory.inputs?.length && !isCollapsed}
      >
        <Card bg="dark.7" p="sm" radius="sm" mb="-12">
          <Stack gap="xs">
            {factory.inputs?.map((input, index) => (
              <FactoryInputRow
                key={index}
                index={index}
                input={input}
                factoryId={factory.id}
                onChangeHandler={onChangeHandler}
              />
            ))}
          </Stack>
        </Card>
      </Collapse>
    </Card>
  );
}
