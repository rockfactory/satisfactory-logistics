import {
  ActionIcon,
  Card,
  Collapse,
  Group,
  Stack,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import moize from 'moize';
import * as React from 'react';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  FactoryInputIcon,
  FactoryOutputIcon,
} from './components/peek/icons/OutputInputIcons';
import { FactoryInputRow } from './FactoryInputRow';
import { FactoryOutputRow } from './FactoryOutputRow';
import { factoryActions, GameFactory } from './store/FactoriesSlice';
import { useIsFactoryVisible } from './useIsFactoryVisible';

export interface IFactoryRowProps {
  factory: GameFactory;
  index: number;
}

export type FactoryChangeHandler = (
  id: string,
  path: string,
) => (
  value: string | null | number | React.ChangeEvent<HTMLInputElement>,
) => void;

export function FactoryRow(props: IFactoryRowProps) {
  const { factory, index } = props;
  const dispatch = useDispatch();
  const onChangeFactory = useCallback(
    moize(
      (id: string, path: string) =>
        (
          value: string | null | number | React.ChangeEvent<HTMLInputElement>,
        ) => {
          if (typeof value === 'object' && value?.currentTarget) {
            value = value.currentTarget.value;
          }
          dispatch(factoryActions.updateAtPath({ id, path, value }));
        },
      { maxSize: 100 },
    ),
    [dispatch],
  );

  const isVisible = useIsFactoryVisible(factory.id, true);
  if (!isVisible) return null;

  return (
    <Card key={factory.id} withBorder>
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
            onChange={onChangeFactory(factory.id, 'name')}
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
                  factory={factory}
                  onChangeFactory={onChangeFactory}
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
              onClick={() =>
                dispatch(factoryActions.addInput({ id: factory.id }))
              }
            >
              <FactoryInputIcon stroke={2} size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Add Output" position="top">
            <ActionIcon
              variant="filled"
              color="blue"
              size="lg"
              onClick={() =>
                dispatch(factoryActions.addOutput({ id: factory.id }))
              }
            >
              <FactoryOutputIcon stroke={2} size={16} />
            </ActionIcon>
          </Tooltip>

          <ActionIcon
            variant="filled"
            color="red"
            size="lg"
            onClick={() => dispatch(factoryActions.remove({ id: factory.id }))}
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
                onChangeFactory={onChangeFactory}
              />
            ))}
          </Stack>
        </Card>
      </Collapse>
    </Card>
  );
}
