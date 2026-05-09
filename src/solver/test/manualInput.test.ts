import { describe, expect, test } from 'vitest';
import { MANUAL_SOURCE_ID } from '@/factories/Factory';
import { itemId } from '@/recipes/itemId';
import { loadHighs, solveProduction } from '@/solver/algorithm/solveProduction';

describe('manualInput', () => {
  test('treats a Manual-sourced input as a finite supply budget', async () => {
    const highs = await loadHighs();
    const solution = solveProduction(highs, {
      inputs: [
        {
          factoryId: MANUAL_SOURCE_ID,
          amount: 30,
          resource: itemId('Desc_Stone_C'),
        },
      ],
      outputs: [{ amount: 10, resource: itemId('Desc_Cement_C') }],
    });

    const inputNode = solution?.nodes.find(
      n =>
        n.type === 'Resource' &&
        n.data.resource.id === 'Desc_Stone_C' &&
        n.data.input?.resource === 'Desc_Stone_C',
    );

    expect(solution?.result.Status).toBe('Optimal');
    expect(inputNode).not.toBeNull();
    expect(inputNode?.data.value).toBe(15);
    if (inputNode?.type === 'Resource') {
      expect(inputNode.data.input?.factoryId).toBe(MANUAL_SOURCE_ID);
    } else {
      throw new Error('expected a Resource node');
    }
  });

  test('forces the Manual budget when constraint is exact', async () => {
    const highs = await loadHighs();
    const solution = solveProduction(highs, {
      inputs: [
        {
          factoryId: MANUAL_SOURCE_ID,
          amount: 30,
          constraint: 'exact',
          resource: itemId('Desc_Stone_C'),
        },
      ],
      outputs: [
        { amount: 0, objective: 'max', resource: itemId('Desc_Cement_C') },
      ],
    });

    const inputNode = solution?.nodes.find(
      n =>
        n.type === 'Resource' &&
        n.data.resource.id === 'Desc_Stone_C' &&
        n.data.input?.resource === 'Desc_Stone_C',
    );

    expect(solution?.result.Status).toBe('Optimal');
    expect(inputNode?.data.value).toBe(30);
  });
});
