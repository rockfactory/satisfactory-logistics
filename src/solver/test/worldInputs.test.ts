import { getAllDefaultRecipesIds } from '@/recipes/graph/getAllDefaultRecipes';
import { itemId } from '@/recipes/itemId';
import { describe, expect, test } from 'vitest';
import { loadHighs, solveProduction } from '../algorithm/solveProduction';

describe('worldInputs', () => {
  test('should prefer world inputs instead of adding world var', async () => {
    const highs = await loadHighs();
    const solution = solveProduction(highs, {
      inputs: [
        {
          amount: 30,
          resource: itemId('Desc_Stone_C'),
        },
      ],
      outputs: [{ amount: 10, resource: itemId('Desc_Cement_C') }],
    });
    // console.log(solution?.nodes);

    const inputNode = solution?.nodes.find(
      n =>
        n.type === 'Resource' &&
        n.data.resource.id === 'Desc_Stone_C' &&
        n.data.input?.resource === 'Desc_Stone_C',
    );

    expect(solution?.result.Status).toBe('Optimal');
    expect(inputNode).not.toBeNull();
    expect(inputNode?.data.value).toBe(15);
  });

  test('should prefer world inputs with high amounts', async () => {
    const highs = await loadHighs();
    const solution = solveProduction(highs, {
      inputs: [
        {
          amount: 100,
          resource: itemId('Desc_SAM_C'),
        },
      ],
      outputs: [{ amount: 200, resource: itemId('Desc_FicsiteIngot_C') }],
    });

    const inputNode = solution?.nodes.find(
      n =>
        n.type === 'Resource' &&
        n.data.resource.id === 'Desc_SAM_C' &&
        n.data.input?.resource === 'Desc_SAM_C',
    );

    expect(solution?.result.Status).toBe('Optimal');
    expect(inputNode).not.toBeNull();
    expect(inputNode?.data.value).toBe(100);
  });

  test('should still optimize recipes with user inputs', async () => {
    const highs = await loadHighs();
    const solution = solveProduction(highs, {
      inputs: [
        {
          amount: 30,
          constraint: 'max',
          resource: itemId('Desc_Stone_C'),
        },
      ],
      outputs: [
        { amount: 0, objective: 'max', resource: itemId('Desc_Cement_C') },
      ],
      allowedRecipes: getAllDefaultRecipesIds().concat([
        'Recipe_Alternate_WetConcrete_C',
      ]),
      // Force to use the input
      blockedResources: [itemId('Desc_Stone_C')],
      blockedBuildings: ['Build_Converter_C'],
    });
    console.log(solution?.nodes);

    const inputNode = solution?.nodes.find(
      n =>
        n.type === 'Resource' &&
        n.data.resource.id === 'Desc_Stone_C' &&
        n.data.input?.resource === 'Desc_Stone_C',
    );

    const outputNode = solution?.nodes.find(
      n => n.type === 'Byproduct' && n.data.resource.id === 'Desc_Cement_C',
    );

    const wetConcreteNode = solution?.nodes.find(
      n =>
        n.type === 'Machine' &&
        n.data.recipe.id === 'Recipe_Alternate_WetConcrete_C',
    );

    expect(solution?.result.Status).toBe('Optimal');
    expect(inputNode).not.toBeNull();
    expect(inputNode?.data.value).toBe(30);
    expect(outputNode).not.toBeNull();
    expect(outputNode?.data.value).toBe(20); // Wet concrete
    expect(wetConcreteNode).not.toBeNull();
    expect(wetConcreteNode?.data.value).toBe(20);
  });
});
