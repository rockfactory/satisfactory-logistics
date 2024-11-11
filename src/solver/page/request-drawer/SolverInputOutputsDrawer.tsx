import type { FormOnChangeHandler } from '@/core/form/useFormOnChange';
import { loglev } from '@/core/logger/log';
import type { SolverInstance } from '@/solver/store/Solver';
import { usePathSolverRequest } from '@/solver/store/solverSelectors';
import { Button, Grid, Portal, Select, Stack, Text } from '@mantine/core';
import { IconFocus, IconWand } from '@tabler/icons-react';
import { useShallowStore, useStore } from '@/core/zustand';
import {
  FactoryInputIcon,
  FactoryOutputIcon,
} from '@/factories/components/peek/icons/OutputInputIcons';
import { FactoryInputRow } from '@/factories/inputs/input-row/FactoryInputRow';
import { FactoryOutputRow } from '@/factories/inputs/output-row/FactoryOutputRow';
import { useFactoryOnChangeHandler } from '@/factories/store/factoriesSelectors';
import type { ISolverSolution } from '@/solver/page/SolverPage';

const logger = loglev.getLogger('solver:inputs-outputs');

export interface ISolverInputOutputsDrawerProps {
  id?: string | null | undefined;
  solution: ISolverSolution | null;
  onSolverChangeHandler: FormOnChangeHandler<SolverInstance>;
}

export function SolverInputOutputsDrawer(
  props: ISolverInputOutputsDrawerProps,
) {
  const { id, solution, onSolverChangeHandler } = props;

  const onChangeHandler = useFactoryOnChangeHandler(id);

  const request = usePathSolverRequest();

  const inputs = useShallowStore(
    state => state.factories.factories[id ?? '']?.inputs ?? [],
  );
  const outputs = useShallowStore(
    state => state.factories.factories[id ?? '']?.outputs ?? [],
  );

  const handleAutoSetInputs = () => {
    if (!solution) return;
    logger.log('Auto-setting inputs from solution', solution);
    useStore.getState().autoSetInputsFromSolver(id!, solution);
  };

  return (
    <>
      <Portal target="#solver-request-drawer_title">
        <Select
          leftSection={<IconFocus size={16} />}
          data={[
            { value: 'minimize_resources', label: 'Minimize Resources' },
            { value: 'minimize_power', label: 'Minimize Power' },
            { value: 'minimize_area', label: 'Minimize Area' },
            // TODO Centralize defs
          ]}
          placeholder="Objective"
          value={request?.objective ?? 'minimize_resources'}
          onChange={onSolverChangeHandler('request.objective')}
        />
      </Portal>
      <Stack gap="md">
        <Stack gap="xs">
          <Text size="lg">Inputs</Text>
          {inputs?.map((input, i) => (
            <FactoryInputRow
              key={i}
              index={i}
              input={input}
              factoryId={id!}
              onChangeHandler={onChangeHandler}
              displayMode="solver"
            />
          ))}
          <Grid>
            <Grid.Col span={8}>
              <Button
                w="100%"
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
            </Grid.Col>
            {solution && (
              <Grid.Col span={4}>
                <Button
                  w="100%"
                  size="sm"
                  disabled={solution.result.Status !== 'Optimal'}
                  leftSection={<IconWand />}
                  variant="light"
                  color="grape"
                  onClick={e => handleAutoSetInputs()}
                >
                  Auto-set from Plan
                </Button>
              </Grid.Col>
            )}
          </Grid>
        </Stack>
        <Stack gap="sm">
          <Text size="lg">Outputs</Text>
          {outputs.map((output, i) => (
            <FactoryOutputRow
              key={i}
              index={i}
              output={output}
              factoryId={id!}
              displayMode="solver"
            />
          ))}
          <Button
            w="100%"
            size="sm"
            color="blue"
            variant="filled"
            leftSection={<FactoryOutputIcon />}
            onClick={() => {
              useStore.getState().addFactoryOutput(id!);
            }}
          >
            Add Output
          </Button>
        </Stack>
      </Stack>
    </>
  );
}
