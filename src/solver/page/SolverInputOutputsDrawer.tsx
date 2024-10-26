import { loglev } from '@/core/logger/log';
import { Button, Drawer, Grid, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArrowsCross, IconWand } from '@tabler/icons-react';
import { useShallowStore, useStore } from '../../core/zustand';
import {
  FactoryInputIcon,
  FactoryOutputIcon,
} from '../../factories/components/peek/icons/OutputInputIcons';
import { FactoryInputRow } from '../../factories/inputs/input-row/FactoryInputRow';
import { FactoryOutputRow } from '../../factories/inputs/output-row/FactoryOutputRow';
import { useFactoryOnChangeHandler } from '../../factories/store/factoriesSelectors';
import type { ISolverSolution } from './SolverPage';

const logger = loglev.getLogger('solver:inputs-outputs');
export interface ISolverInputOutputsDrawerProps {
  id?: string | null | undefined;
  solution: ISolverSolution | null;
}

export function SolverInputOutputsDrawer(
  props: ISolverInputOutputsDrawerProps,
) {
  const { id, solution } = props;
  const [opened, { open, close }] = useDisclosure();

  const onChangeHandler = useFactoryOnChangeHandler(id);

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
      <Button
        size="sm"
        variant="filled"
        leftSection={<IconArrowsCross size={16} />}
        onClick={open}
      >
        Inputs / Outputs
      </Button>
      <Drawer
        position="right"
        size="xl"
        opened={opened}
        onClose={close}
        title={
          <Stack>
            <Text size="xl">Inputs & Outputs</Text>
          </Stack>
        }
      >
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
      </Drawer>
    </>
  );
}
