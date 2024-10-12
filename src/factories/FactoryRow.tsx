import { Path, setByPath } from '@clickbar/dot-diver';
import {
  ActionIcon,
  Card,
  Collapse,
  Group,
  Stack,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconCalculator, IconTrash } from '@tabler/icons-react';
import * as React from 'react';
import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useFormOnChange } from '../core/form/useFormOnChange';
import { useStore } from '../core/zustand';
import {
  FactoryInputIcon,
  FactoryOutputIcon,
} from './components/peek/icons/OutputInputIcons';
import { Factory } from './Factory';
import { FactoryInputRow } from './FactoryInputRow';
import { FactoryOutputRow } from './FactoryOutputRow';
import { useIsFactoryVisible } from './useIsFactoryVisible';

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
  if (!isVisible) return null;

  return (
    <Card key={id} withBorder>
      {/* <Text size="sm" fw="bold">
            {factory.name}
          </Text> */}
      <Group gap="sm" align="flex-start" justify="space-between">
        <Group gap="sm" align="flex-start">
          {/* <Grid.Col span={6}> */}
          <TextInput
            variant="unstyled"
            placeholder="Factory..."
            fw={'bold'}
            w={180}
            defaultValue={factory.name ?? ''}
            onChange={onChangeHandler('name')}
          />
          {/* </Grid.Col>
            <Grid.Col span={9}> */}
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

          <ActionIcon
            variant="filled"
            color="red"
            size="lg"
            onClick={() => useStore.getState().removeGameFactory(id)}
          >
            <IconTrash stroke={2} size={16} />
          </ActionIcon>
        </Group>
      </Group>
      {/* </Grid.Col> */}

      <Collapse mt="sm" ml="-12px" in={!!factory.inputs?.length}>
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
