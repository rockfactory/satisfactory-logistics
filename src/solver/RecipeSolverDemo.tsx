import { Box, Group, LoadingOverlay, NumberInput, Stack } from '@mantine/core';
import { ReactFlowProvider } from '@xyflow/react';
import { Highs } from 'highs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { log } from '@/core/logger/log';
import { FactoryItemInput } from '@/factories/inputs/FactoryItemInput';
import { loadHighs, solveProduction } from './algorithm/solveProduction';
import { SolverLayout } from './layout/SolverLayout';

const logger = log.getLogger('recipes:solver:demo');

export interface IRecipeSolverDemoProps {}

export function RecipeSolverDemo(props: IRecipeSolverDemoProps) {
  const [resource, setResource] = useState<string | null>(null);
  const [amount, setAmount] = useState(null as number | null);

  const [loading, setLoading] = useState(true);

  const highsRef = useRef<Highs | null>(null);

  useEffect(() => {
    async function load() {
      console.log('Loading highs');
      const highs = await loadHighs();
      highsRef.current = highs;
      console.log('Highs loaded');
      setLoading(false);
    }

    load().catch(error => {
      console.error(error);
      setLoading(false);
    });
  }, []);

  const solution = useMemo(() => {
    if (!highsRef.current) return null;

    const solution = solveProduction(highsRef.current!, {
      inputs: [],
      outputs: [
        {
          resource: resource ?? 'Desc_AluminumIngot_C', // 'Desc_AluminumIngot_C',
          amount: amount ?? 150, // 150,
        },
      ],
    });
    try {
      logger.log(`Solved -> `, solution);
      // logger.log();
    } catch (e) {
      console.warn(e);
    }
    return solution;
  }, [resource, amount]);

  return (
    <div>
      <Box mb="md" pos="relative">
        <LoadingOverlay visible={loading} />
        <Group gap="sm">
          <FactoryItemInput
            value={resource}
            onChange={setResource}
            label="Resource"
            size="sm"
          />
          <NumberInput
            value={amount ?? 0}
            onChange={v => setAmount(Number(v))}
            label="Amount"
            min={0}
          />
        </Group>
        {solution && (
          <Stack gap="md">
            <ReactFlowProvider>
              <SolverLayout nodes={solution.nodes} edges={solution.edges} />
            </ReactFlowProvider>
          </Stack>
        )}
      </Box>
    </div>
  );
}
