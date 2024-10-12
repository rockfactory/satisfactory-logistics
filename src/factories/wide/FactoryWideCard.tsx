import { Path, setByPath } from '@clickbar/dot-diver';
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
import { IconCalculator, IconTrash } from '@tabler/icons-react';
import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useFormOnChange } from '../../core/form/useFormOnChange';
import { useStore } from '../../core/zustand';
import {
  FactoryInputIcon,
  FactoryOutputIcon,
} from '../components/peek/icons/OutputInputIcons';
import { Factory } from '../Factory';
import { FactoryInputRow } from '../FactoryInputRow';
import { FactoryOutputRow } from '../FactoryOutputRow';
import { useIsFactoryVisible } from '../useIsFactoryVisible';

export interface IFactoryWideCardProps {
  id: string;
  index: number;
}

export function FactoryWideCard(props: IFactoryWideCardProps) {
  const { id, index } = props;

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

  const isVisible = useIsFactoryVisible(factory.id, true);
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
          w={380}
          defaultValue={factory.name ?? ''}
          onChange={onChangeHandler('name')}
        />
        <Box>
          <Group gap="sm">
            <Button
              color="blue"
              variant="light"
              size="sm"
              onClick={() => useStore.getState().addFactoryInput(id)}
              leftSection={<FactoryInputIcon stroke={2} size={16} />}
            >
              Add Input
            </Button>
            <Button
              color="blue"
              variant="filled"
              size="sm"
              onClick={() => useStore.getState().addFactoryOutput(id)}
              leftSection={<FactoryOutputIcon stroke={2} size={16} />}
            >
              Add Output
            </Button>

            <Button
              color="cyan"
              variant="filled"
              size="sm"
              component={Link}
              to={`/factories/${factory.id}/calculator`}
              leftSection={<IconCalculator stroke={2} size={16} />}
            >
              Calculator
            </Button>

            <ActionIcon
              variant="filled"
              color="red"
              size="lg"
              onClick={() => useStore.getState().removeGameFactory(id)}
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
                  factoryId={factory.id}
                  output={output}
                  index={i}
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
                  factoryId={factory.id}
                  input={input}
                  index={i}
                  onChangeHandler={onChangeHandler}
                />
              ))}
            </Stack>
          </Paper>
        </Card.Section>
      )}
    </Card>
  );
}
