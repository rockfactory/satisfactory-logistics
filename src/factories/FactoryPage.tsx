import {
  Box,
  Button,
  Container,
  Group,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import React, { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  useFactoryInputsOutputs,
  useFactorySimpleAttributes,
} from '@/factories/store/factoriesSelectors.ts';
import { FactoryInputRow } from '@/factories/inputs/input-row/FactoryInputRow.tsx';
import { Path, setByPath } from '@clickbar/dot-diver';
import { Factory, FactoryProgressStatus } from '@/factories/Factory.ts';
import { useStore } from '@/core/zustand.ts';
import { useFormOnChange } from '@/core/form/useFormOnChange.ts';
import {
  IconArrowLeft,
  IconPlus,
  IconProgressCheck,
} from '@tabler/icons-react';
import { SolverResetButton } from '@/solver/page/SolverResetButton.tsx';
import { SolverRequestDrawer } from '@/solver/page/request-drawer/SolverRequestDrawer.tsx';
import { GameSettingsModal } from '@/games/settings/GameSettingsModal.tsx';
import { AfterHeaderSticky } from '@/layout/AfterHeaderSticky.tsx';
import { FactoryOutputRow } from '@/factories/inputs/output-row/FactoryOutputRow.tsx';
import { progressProperties } from '@/factories/ProgressChip.tsx';
import { useSolverSolution } from '@/solver/page/useSolverSolution.ts';
import { SolverSolutionFragment } from '@/solver/page/SolverSolutionFragment.tsx';

const progressValues: { value: FactoryProgressStatus; label: string }[] = [
  {
    value: 'draft',
    label: 'Draft',
  },
  {
    value: 'to_be_done',
    label: 'To be done',
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

const ProductionView = ({ id }: { id: string }) => {
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
          </Stack>
        </Stack>
        <Stack gap="sm" align="stretch" bg="dark" p="md">
          <Text size="lg">Properties</Text>
          <TextInput
            value={factory?.name ?? 'Solver'}
            placeholder="Factory Name"
            label="Name"
            onChange={e => {
              useStore
                .getState()
                .updateFactory(
                  factory.id,
                  f => (f.name = e.currentTarget.value),
                );
            }}
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

const FactoryGraph = ({ id }) => {
  const { suggestions, instance, solution, loading, onChangeHandler } = useSolverSolution(id);

  return <Box h='80vh' pos={'relative'}>
    <Box pos={'absolute'} right={0} top={0} style={{ zIndex: 99 }} p='md'>

      <SolverRequestDrawer solution={solution} onSolverChangeHandler={onChangeHandler} />
    </Box>
    {!loading && (
      <SolverSolutionFragment
        suggestions={suggestions}
        solution={solution!}
        instance={instance}
      />
    ) }
  </Box>
};

export const FactoryPage = () => {
  const { id } = useParams<{ id: string }>();
  const [currentView, setCurrentView] = useState<'overview' | 'graph'>(
    'overview',
  );

  if (!id) {
    throw new Error();
  }

  const factory = useFactorySimpleAttributes(id);

  return (
    <>
      <AfterHeaderSticky>
        <Group gap="sm" justify="space-between">
          <Group gap="sm">
            <Button
              component={Link}
              to="/factories"
              variant="light"
              color="gray"
              leftSection={<IconArrowLeft size={16} />}
            >
              All Factories
            </Button>
            <Title order={4}>{factory.name}</Title>
          </Group>
          <Group gap="sm">
            <SegmentedControl
              data={[
                { value: 'overview', label: 'Overview' },
                { value: 'graph', label: 'Graph' },
              ]}
              value={currentView}
              onChange={val => setCurrentView(val as 'overview' | 'graph')}
            />
            <GameSettingsModal />
          </Group>
        </Group>
      </AfterHeaderSticky>
      {currentView === 'overview' && <ProductionView id={id} />}
      {currentView === 'graph' && <FactoryGraph id={id} />}
    </>
  );
};
