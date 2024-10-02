import { Box, Group, LoadingOverlay, NumberInput } from '@mantine/core';
import { Highs } from 'highs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FactoryItemInput } from '../../factories/inputs/FactoryItemInput';
import { SolverLayout } from './SampleSolverLayout';
import { loadHighs, solveProduction } from './solveProduction';

export interface IRecipeSolverDemoProps {}

export function RecipeSolverDemo(props: IRecipeSolverDemoProps) {
  const [resource, setResource] = useState<string | null>('');
  const [amount, setAmount] = useState(0);

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
    // if (!resource || amount === 0) {
    //   return null;
    // }

    if (!highsRef.current) return null;

    const solution = solveProduction(
      highsRef.current!,
      resource || 'Desc_SteelIngot_C',
      amount || 40,
    );
    console.log(`Solved -> `, solution);
    return solution;
  }, [resource, amount, loading]);

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
            value={amount}
            onChange={v => setAmount(Number(v))}
            label="Amount"
            min={0}
          />
        </Group>
        {solution && (
          <SolverLayout nodes={solution.nodes} edges={solution.edges} />
        )}
      </Box>
    </div>
  );
}
