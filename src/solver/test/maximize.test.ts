import type { FactoryItemId } from '@/recipes/FactoryItemId';
import { expect, test } from 'vitest';
import { loadHighs, solveProduction } from '../algorithm/solveProduction';

test('should compute maximization with free inputs (unconstrained)', async () => {
  const highs = await loadHighs();
  const solution = solveProduction(highs, {
    inputs: [
      {
        amount: 90,
        resource: 'Desc_SteelIngot_C' as FactoryItemId,
      },
    ],
    outputs: [{ amount: 5, resource: 'Desc_SteelPlate_C' as FactoryItemId }],
  });
  expect(solution?.result.Status).toBe('Optimal');
});
