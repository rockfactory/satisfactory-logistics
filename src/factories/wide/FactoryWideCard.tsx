import {
  ActionIcon,
  Box,
  Button,
  Card,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import {
  IconArrowDownToArc,
  IconArrowLeftFromArc,
  IconTrash,
} from '@tabler/icons-react';
import moize from 'moize';
import * as React from 'react';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { FactoryInputRow } from '../FactoryInputRow';
import { FactoryOutputRow } from '../FactoryOutputRow';
import { factoryActions, GameFactory } from '../store/FactoriesSlice';
import { useIsFactoryVisible } from '../useIsFactoryVisible';

export interface IFactoryWideCardProps {
  factory: GameFactory;
  index: number;
}

export function FactoryWideCard(props: IFactoryWideCardProps) {
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
  console.log('isVisible', isVisible);
  if (!isVisible) return null;

  return (
    <Card shadow="lg" withBorder>
      <Group gap="sm" justify="space-between">
        <TextInput
          variant="unstyled"
          placeholder="Shenanigans..."
          fw={'bold'}
          fz={'h1'}
          size="lg"
          mb="xs"
          w={180}
          defaultValue={factory.name ?? ''}
          onChange={onChangeFactory(factory.id, 'name')}
        />
        <Box>
          <Group gap="sm">
            <Button
              color="blue"
              variant="light"
              size="sm"
              onClick={() =>
                dispatch(factoryActions.addInput({ id: factory.id }))
              }
              leftSection={<IconArrowDownToArc stroke={2} size={16} />}
            >
              Add Input
            </Button>
            <Button
              color="blue"
              variant="filled"
              size="sm"
              onClick={() =>
                dispatch(factoryActions.addOutput({ id: factory.id }))
              }
              leftSection={<IconArrowLeftFromArc stroke={2} size={16} />}
            >
              Add Output
            </Button>

            <ActionIcon
              variant="filled"
              color="red"
              size="lg"
              onClick={() =>
                dispatch(factoryActions.remove({ id: factory.id }))
              }
            >
              <IconTrash stroke={2} size={16} />
            </ActionIcon>
          </Group>
        </Box>
      </Group>
      {factory.outputs && factory.outputs.length > 0 && (
        <Card.Section title="Outputs" withBorder>
          <Paper radius="sm" p="sm">
            <Stack gap={'sm'}>
              <Text fw={500}>Outputs</Text>

              {(
                factory.outputs ?? [
                  { name: null, resource: null, amount: null },
                ]
              ).map((output, i) => (
                <FactoryOutputRow
                  key={i}
                  factory={factory}
                  output={output}
                  index={i}
                  onChangeFactory={onChangeFactory}
                />
              ))}
            </Stack>
          </Paper>
        </Card.Section>
      )}
      {factory.inputs && factory.inputs.length > 0 && (
        <Card.Section title="Inputs" withBorder>
          <Paper radius="sm" p="sm">
            <Stack gap={'sm'}>
              <Text fw={500}>Inputs</Text>
              {(factory.inputs ?? []).map((input, i) => (
                <FactoryInputRow
                  key={i}
                  factory={factory}
                  input={input}
                  index={i}
                  onChangeFactory={onChangeFactory}
                />
              ))}
            </Stack>
          </Paper>
        </Card.Section>
      )}
    </Card>
  );
}
