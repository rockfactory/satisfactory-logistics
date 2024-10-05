import { Box, Group, LoadingOverlay, NumberInput, Stack } from '@mantine/core';
import { ReactFlowProvider } from '@xyflow/react';
import { useMemo, useState } from 'react';
import { FactoryItemInput } from '../../../factories/inputs/FactoryItemInput';
import { AfterHeaderSticky } from '../../../layout/AfterHeaderSticky';
import { ISolveRequest, solveProduction, useHighs } from '../solveProduction';
import { SolverLayout } from '../SolverLayout';

export interface ISolverPageProps {}

export function SolverPage(props: ISolverPageProps) {
  const { highsRef, loading } = useHighs();

  const [request, setRequest] = useState<ISolveRequest | null>({
    outputs: [{ item: 'Desc_AluminumIngot_C', amount: 40 }],
  });

  const solution = useMemo(() => {
    if (!request || !highsRef.current || loading) return null;

    const solution = solveProduction(
      highsRef.current,
      request.outputs[0].item!,
      request.outputs[0].amount!,
    );
    console.log(`Solved -> `, solution);
    return solution;
  }, [request, loading]);

  return (
    <Box w="100%" pos="relative">
      <LoadingOverlay visible={loading} />
      {/* <RecipeSolverDemo />
      z */}

      <AfterHeaderSticky>
        <Group gap="sm">
          <FactoryItemInput
            value={request?.outputs[0].item}
            onChange={v =>
              setRequest({ outputs: [{ ...request?.outputs[0], item: v }] })
            }
            label="Resource"
            size="sm"
          />
          <NumberInput
            value={request?.outputs[0].amount ?? undefined}
            onChange={v =>
              setRequest({
                outputs: [
                  { ...request?.outputs[0], amount: v ? Number(v) : null },
                ],
              })
            }
            label="Amount"
            min={0}
          />
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
