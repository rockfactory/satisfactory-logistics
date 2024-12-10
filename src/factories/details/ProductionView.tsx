import { Factory, FactoryProgressStatus } from '@/factories/Factory';
import {
  useFactoryInputsOutputs,
  useFactorySimpleAttributes,
} from '@/factories/store/factoriesSelectors';
import { useCallback } from 'react';
import { Path, setByPath } from '@clickbar/dot-diver';
import { useStore } from '@/core/zustand';
import { useFormOnChange } from '@/core/form/useFormOnChange';
import { progressProperties } from '@/factories/components/progressProperties';
import {
  Button,
  Container,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { FactoryInputRow } from '@/factories/inputs/input-row/FactoryInputRow';
import {
  FactoryInputIcon,
  FactoryOutputIcon,
} from '@/factories/components/peek/icons/OutputInputIcons';
import { FactoryOutputRow } from '@/factories/inputs/output-row/FactoryOutputRow';

const progressValues: { value: FactoryProgressStatus; label: string }[] = [
  {
    value: 'draft',
    label: 'Draft',
  },
  {
    value: 'todo',
    label: 'Todo',
  },
  {
    value: 'in_progress',
    label: 'In progress',
  },
  {
    value: 'done',
    label: 'Done',
  },
];

export const ProductionView = ({ id }: { id: string }) => {
  const factory = useFactorySimpleAttributes(id);
  const { inputs, outputs } = useFactoryInputsOutputs(id);
  const update = useCallback(
    (path: Path<Factory>, value: string | null | number) => {
      useStore
        .getState()
        .updateFactory(id, state => setByPath(state, path, value));
    },
    [id],
  );
  const onChangeHandler = useFormOnChange<Factory>(update);
  const status = factory.progress && progressProperties[factory.progress];

  return (
    <Container size="lg">
      <Group gap="xl" align="start" py="xl">
        <Stack gap="lg" style={{ flexGrow: 1 }}>
          <Stack gap="sm">
            <Text size="lg">Inputs</Text>
            <Stack gap="xs">
              {inputs?.map((input, i) => (
                <FactoryInputRow
                  key={i}
                  index={i}
                  input={input}
                  factoryId={id!}
                  onChangeHandler={onChangeHandler}
                  displayMode="factory"
                />
              ))}
            </Stack>

            <Button
              size="sm"
              leftSection={<FactoryInputIcon />}
              color="blue"
              variant="light"
              onClick={() => {
                useStore.getState().addFactoryInput(id!);
              }}
            >
              Add Input
            </Button>
          </Stack>
          <Stack gap="sm">
            <Text size="lg">Outputs</Text>

            <Stack gap="xs">
              {outputs?.map((output, i) => (
                <FactoryOutputRow
                  key={i}
                  index={i}
                  output={output}
                  factoryId={id!}
                  displayMode="factory"
                />
              ))}
            </Stack>

            <Button
              size="sm"
              leftSection={<FactoryOutputIcon />}
              color="blue"
              variant="filled"
              onClick={() => {
                useStore.getState().addFactoryOutput(id!);
              }}
            >
              Add Output
            </Button>
          </Stack>
        </Stack>
        <Stack gap="sm" align="stretch" bg="dark" p="md">
          <Text size="lg">Properties</Text>
          <TextInput
            value={factory?.name}
            placeholder="Factory Name"
            label="Name"
            onChange={onChangeHandler('name')}
          />
          <Select
            variant="filled"
            label="Progress"
            placeholder={'Select a value'}
            data={progressValues}
            value={factory.progress}
            onChange={status =>
              update('progress', status as FactoryProgressStatus)
            }
            leftSection={
              status && (
                <status.Icon
                  color={`var(--mantine-color-${status.color}-text)`}
                  size={18}
                />
              )
            }
          />
        </Stack>
      </Group>
    </Container>
  );
};
