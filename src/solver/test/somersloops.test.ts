import { getAllDefaultRecipesIds } from '@/recipes/graph/getAllDefaultRecipes';
import { itemId } from '@/recipes/itemId';
import { loadHighs, solveProduction } from '@/solver/algorithm/solveProduction';
import { describe, expect, test } from 'vitest';

describe('Somersloops', () => {
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
