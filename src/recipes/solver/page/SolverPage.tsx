import {
  Box,
  Button,
  Group,
  LoadingOverlay,
  NumberInput,
  Stack,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { ReactFlowProvider } from '@xyflow/react';
import moize from 'moize';
import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { FactoryItemInput } from '../../../factories/inputs/FactoryItemInput';
import { AfterHeaderSticky } from '../../../layout/AfterHeaderSticky';
import { solveProduction, useHighs } from '../solveProduction';
import { SolverLayout } from '../SolverLayout';
import { solverActions, useCurrentSolverInstance } from '../store/SolverSlice';

export interface ISolverPageProps {}

export function SolverPage(props: ISolverPageProps) {
  const { highsRef, loading } = useHighs();
  const dispatch = useDispatch();

  const instance = useCurrentSolverInstance();
  useEffect(() => {
    dispatch(solverActions.createIfNoCurrent({}));
  }, [instance]);

  const onChangeSolver = useCallback(
    moize(
      (path: string) =>
        (
          value: string | null | number | React.ChangeEvent<HTMLInputElement>,
        ) => {
          if (typeof value === 'object' && value?.currentTarget) {
            value = value.currentTarget.value;
          }
          dispatch(solverActions.updateAtPath({ path, value }));
        },
      { maxSize: 100 },
    ),
    [dispatch],
  );

  const solution = useMemo(() => {
    if (!instance?.request || !highsRef.current || loading) return null;

    const solution = solveProduction(highsRef.current, instance?.request);
    console.log(`Solved -> `, solution);
    return solution;
  }, [instance?.request, loading]);

  return (
    <Box w="100%" pos="relative">
      <LoadingOverlay visible={loading} />
      {/* <RecipeSolverDemo />
      z */}

      <AfterHeaderSticky>
        <Group gap="sm">
          <Stack gap="sm">
            {instance?.request.outputs.map((output, index) => (
              <Group key={index} gap="sm">
                <FactoryItemInput
                  value={output.item}
                  onChange={onChangeSolver(`request.outputs.${index}.item`)}
                  label="Resource"
                  size="sm"
                />
                <NumberInput
                  value={output.amount ?? undefined}
                  onChange={onChangeSolver(`request.outputs.${index}.amount`)}
                  label="Amount"
                  min={0}
                />
                <Button
                  onClick={() => {
                    dispatch(
                      solverActions.updateAtPath({
                        path: `request.outputs.${instance.request?.outputs.length ?? 0}`,
                        value: { item: null, amount: null },
                      }),
                    );
                  }}
                >
                  <IconPlus size={16} />
                </Button>
              </Group>
            ))}
          </Stack>
          <Group gap="sm">
            <Button
              color="red"
              variant="subtle"
              onClick={() =>
                dispatch(solverActions.remove({ id: instance!.id }))
              }
            >
              <IconTrash size={16} />
            </Button>
          </Group>
        </Group>
      </AfterHeaderSticky>
      {solution && (
        <Stack gap="md">
          <ReactFlowProvider>
            <SolverLayout nodes={solution.nodes} edges={solution.edges} />
          </ReactFlowProvider>
        </Stack>
      )}
    </Box>
  );
}
