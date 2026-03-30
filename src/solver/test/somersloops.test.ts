import { describe, expect, test } from 'vitest';
import { getAllDefaultRecipesIds } from '@/recipes/graph/getAllDefaultRecipes';
import { itemId } from '@/recipes/itemId';
import { loadHighs, solveProduction } from '@/solver/algorithm/solveProduction';
import type { IMachineNodeData } from '@/solver/layout/nodes/machine-node/MachineNode';

describe('Somersloops', () => {
  test('slooped recipe should be preferred over unslooped when minimizing resources', async () => {
    const highs = await loadHighs();
    const solution = solveProduction(highs, {
      inputs: [
        { resource: itemId('Desc_AluminumIngot_C'), amount: 6000 },
        { resource: itemId('Desc_CopperIngot_C'), amount: 1800 },
      ],
      outputs: [
        {
          resource: itemId('Desc_AluminumCasing_C'),
          amount: 6000,
          somersloops: 32,
        },
      ],
      allowedRecipes: [
        'Recipe_AluminumCasing_C',
        'Recipe_Alternate_AlcladCasing_C',
      ],
      objective: 'minimize_resources',
      nodes: {
        p70r303: { somersloops: 32 },
      },
    });

    expect(solution?.result.Status).toBe('Optimal');

    const alcladNode = solution?.nodes.find(n => n.id === 'p70r303');
    const constructorNode = solution?.nodes.find(n => n.id === 'p70r211');
    const alcladData = alcladNode?.data as IMachineNodeData;

    // With 2/2 somersloops, Alclad should produce at 2x.
    // Copper limit: 1800 → original = 2700, amplified = 2700, total = 5400
    // Remaining 600 from Constructor using 900 Aluminum Ingot
    // Total Aluminum: 3600 + 900 = 4500 (not 6000)
    expect(alcladData?.amplifiedValue).toBe(alcladData?.originalValue);
    expect(alcladData?.value).toBe(5400);
  });

  test('should double byproducts', async () => {
    const highs = await loadHighs();
    const solution = solveProduction(highs, {
      inputs: [],
      outputs: [{ amount: 40, resource: itemId('Desc_Plastic_C') }],
      allowedRecipes: getAllDefaultRecipesIds(),
      nodes: {
        p59r169: {
          // Plastic
          somersloops: 4,
        },
      },
    });

    const inputNode = solution?.nodes.find(
      n =>
        n.type === 'Resource' &&
        n.data.resource.id === itemId('Desc_LiquidOil_C'),
    );

    const plasticNode = solution?.nodes.find(
      n =>
        n.type === 'Byproduct' &&
        n.data.resource.id === itemId('Desc_Plastic_C'),
    );

    const byproductHORNode = solution?.nodes.find(
      n =>
        n.type === 'Byproduct' &&
        n.data.resource.id === itemId('Desc_HeavyOilResidue_C'),
    );

    expect(solution?.result.Status).toBe('Optimal');
    expect(inputNode?.data.value).toBe(30);
    expect(plasticNode?.data.value).toBe(40);
    expect(byproductHORNode?.data.value).toBe(20);
  });
});
