import { itemId } from '@/recipes/itemId';
import { describe, expect, test } from 'vitest';
import { loadHighs, solveProduction } from '@/solver/algorithm/solveProduction';
import { computeAutoSetInputs } from '@/solver/store/auto-set/computeAutoSetInputs';

describe('auto set from inputs', () => {
  test('auto-set should not variate solution', async () => {
    const highs = await loadHighs();
    const solution = solveProduction(highs, {
      inputs: [],
      outputs: [
        { amount: 50, resource: itemId('Desc_ElectromagneticControlRod_C') },
      ],
    });
    const nextInputs1 = computeAutoSetInputs(solution!, {
      inputs: [],
    });

    expect(solution?.result.Status).toBe('Optimal');

    const solution2 = solveProduction(highs, {
      inputs: nextInputs1,
      outputs: [
        { amount: 50, resource: itemId('Desc_ElectromagneticControlRod_C') },
      ],
    });
    const nextInputs2 = computeAutoSetInputs(solution2!, {
      inputs: nextInputs1,
    });

    expect(solution2?.result.Status).toBe('Optimal');
    expect(nextInputs1).toEqual(nextInputs2);
  });
});
