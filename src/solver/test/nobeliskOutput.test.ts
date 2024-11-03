import type { FactoryItemId } from '@/recipes/FactoryItemId';
import { expect, test } from 'vitest';
import { loadHighs, solveProduction } from '../algorithm/solveProduction';

test('nobeliskOutput', async () => {
  const highs = await loadHighs();
  const solution = solveProduction(highs, {
    inputs: [],
    outputs: [
      { amount: 5, resource: 'Desc_NobeliskExplosive_C' as FactoryItemId },
    ],
  });
  expect(solution?.result.Status).toBe('Optimal');
});
