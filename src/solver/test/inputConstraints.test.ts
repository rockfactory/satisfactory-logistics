import { itemId, recipeId } from '@/recipes/itemId';
import { isResourceNode } from '@/solver/algorithm/getSolutionNodes';
import { loadHighs, solveProduction } from '@/solver/algorithm/solveProduction';
import { describe, expect, test } from 'vitest';

describe('inputConstraints', async () => {
  const highs = await loadHighs();

  test('should block extra world resources if max constraint is set', async () => {
    const solution = solveProduction(highs, {
      inputs: [
        // 60 is the minimum
        { amount: 59, resource: itemId('Desc_Stone_C'), constraint: 'max' },
      ],
      outputs: [{ amount: 20, resource: itemId('Desc_Cement_C') }],
      allowedRecipes: [recipeId('Recipe_Concrete_C')],
    });

    const resourceNodes = solution?.nodes.filter(isResourceNode);
    console.log(resourceNodes);

    const limestoneInputNodes = resourceNodes?.filter(
      node => node.data.resource.id === itemId('Desc_Stone_C'),
    );

    console.log(solution?.nodes);
    expect(solution?.result.Status).toBe('Infeasible');
  });

  test('should allow extra world resources if input constraint is set', async () => {
    const solution = solveProduction(highs, {
      inputs: [
        // 60 is the minimum
        { amount: 59, resource: itemId('Desc_Stone_C'), constraint: 'input' },
      ],
      outputs: [{ amount: 20, resource: itemId('Desc_Cement_C') }],
      allowedRecipes: [recipeId('Recipe_Concrete_C')],
    });

    const resourceNodes = solution?.nodes.filter(isResourceNode);
    console.log(resourceNodes);

    const limestoneInputNodes = resourceNodes
      ?.filter(node => node.data.resource.id === itemId('Desc_Stone_C'))
      .sort((a, b) => a.data.value - b.data.value);

    expect(solution?.result.Status).toBe('Optimal');
    expect(limestoneInputNodes).toHaveLength(2);
    expect(limestoneInputNodes?.[0].data).toHaveProperty('value', 1);
    expect(limestoneInputNodes?.[1].data).toHaveProperty('value', 59);
  });
});
