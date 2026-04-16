import { type Path, setByPath } from '@clickbar/dot-diver';
import {
  ActionIcon,
  Alert,
  Button,
  Container,
  Divider,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import {
  IconBulb,
  IconCalculator,
  IconPlayerPause,
  IconX,
} from '@tabler/icons-react';
import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useFormOnChange } from '@/core/form/useFormOnChange';
import { useStore } from '@/core/zustand';
import {
  FactoryInputIcon,
  FactoryOutputIcon,
} from '@/factories/components/peek/icons/OutputInputIcons';
import { progressProperties } from '@/factories/components/progressProperties';
import type { Factory, FactoryProgressStatus } from '@/factories/Factory';
import { FactoryInputRow } from '@/factories/inputs/input-row/FactoryInputRow';
import { FactoryOutputRow } from '@/factories/inputs/output-row/FactoryOutputRow';
import {
  useFactoryInputsOutputs,
  useFactorySimpleAttributes,
} from '@/factories/store/factoriesSelectors';
import classes from './ProductionView.module.css';

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
  {
    value: 'disabled',
    label: 'Disabled',
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
  const hasSolverLayout = useStore(
    state => !!state.solvers.instances[id]?.layout,
  );
  const readyToPlanHintDismissed = useStore(
    state => state.factoryView.readyToPlanHintDismissed ?? false,
  );
  const hasConfiguredOutputs = outputs.some(
    o => o.resource != null && (o.amount ?? 0) > 0,
  );
  const status = factory.progress && progressProperties[factory.progress];

  return (
    <Container size="lg" data-tutorial-id="factory-detail">
      <Group gap="xl" align="start" py="xl">
        <Stack gap="lg" style={{ flexGrow: 1 }}>
          {factory.progress === 'disabled' && (
            <Alert
              icon={<IconPlayerPause size={18} />}
              color="red"
              variant="light"
              title="Factory disabled"
            >
              This factory is disabled. Its inputs and outputs are excluded from
              global usage totals, dependency tables, and charts. Change the
              Progress to re-enable it.
            </Alert>
          )}
          {hasConfiguredOutputs &&
            !hasSolverLayout &&
            !readyToPlanHintDismissed && (
              <Alert
                icon={<IconBulb size={18} />}
                color="cyan"
                variant="light"
                title="Ready to plan?"
                withCloseButton={false}
              >
                <Group
                  gap="xs"
                  align="center"
                  justify="space-between"
                  wrap="nowrap"
                >
                  <Group gap="xs" align="center">
                    <Text size="sm">
                      Use the Calculator to compute your optimal production
                      chain.
                    </Text>
                    <Button
                      component={Link}
                      to={`/factories/${id}/calculator`}
                      size="xs"
                      color="cyan"
                      variant="filled"
                      leftSection={<IconCalculator size={14} />}
                    >
                      Open Calculator
                    </Button>
                  </Group>
                  <ActionIcon
                    variant="subtle"
                    color="cyan"
                    aria-label="Dismiss"
                    onClick={() =>
                      useStore.getState().updateFactoryView(s => {
                        s.readyToPlanHintDismissed = true;
                      })
                    }
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Group>
              </Alert>
            )}
          <Stack gap="sm" data-tutorial-id="factory-inputs">
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
          <Stack gap="sm" data-tutorial-id="factory-outputs">
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
            {outputs.length > 0 && (
              <>
                <Divider my="xs" />
                <Button
                  component={Link}
                  to={`/factories/${id}/calculator`}
                  size="md"
                  leftSection={<IconCalculator size={18} />}
                  color="cyan"
                  variant="light"
                  fullWidth
                >
                  Plan Production in Calculator
                </Button>
              </>
            )}
          </Stack>
        </Stack>
        <Stack
          data-tutorial-id="factory-properties"
          gap="sm"
          align="stretch"
          bg="dark"
          p="md"
          className={classes.sideBar}
        >
          <Text size="lg">Properties</Text>
          <TextInput
            data-tutorial-id="factory-name"
            value={factory?.name ?? undefined}
            placeholder="Factory Name"
            label="Name"
            onChange={onChangeHandler('name')}
          />
          <Select
            data-tutorial-id="factory-progress"
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
