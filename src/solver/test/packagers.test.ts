import { AllFactoryRecipes } from '@/recipes/FactoryRecipe';
import { itemId } from '@/recipes/itemId';
import { loadHighs, solveProduction } from '@/solver/algorithm/solveProduction';
import { describe, expect, test } from 'vitest';

describe('packagers', () => {
  // Should avoid packagers loops and consume correct amount of oil
  test('should produce plastics and rubber with correct packaged fuel amount', async () => {
    const highs = await loadHighs();
    const solution = solveProduction(highs, {
      inputs: [],
      outputs: [
        { amount: 900, resource: itemId('Desc_Plastic_C') },
        { amount: 900, resource: itemId('Desc_Rubber_C') },
      ],
      allowedRecipes: AllFactoryRecipes.map(r => r.id).filter(
        id => id !== 'Recipe_Alternate_DilutedFuel_C',
      ),
    });
    // console.log(solution?.nodes);

    const packagersNode = solution?.nodes.filter(
      n =>
        n.type === 'Machine' && n.data.recipe.producedIn === 'Build_Packager_C',
    );

    expect(solution?.result.Status).toBe('Optimal');
    console.log(packagersNode);
    expect(packagersNode).toHaveLength(2);

    const oilNode = solution?.nodes.filter(
      n =>
        n.type === 'Resource' &&
        n.data.resource.id === itemId('Desc_LiquidOil_C'),
    );
    expect(oilNode).toHaveLength(1);
    expect(oilNode![0].data.value).toBe(600);
  });

  //   test('should avoid packager -> unpackager loops', async () => {
  //     const highs = await loadHighs();
  //     const solution = solveProduction(highs, {
  //       inputs: [],
  //       outputs: [{ amount: 10, resource: itemId('Desc_LiquidTurboFuel_C') }],
  //     });
  //     // console.log(solution?.nodes);

  //     const packagersNode = solution?.nodes.filter(
  //       n =>
  //         n.type === 'Machine' && n.data.recipe.producedIn === 'Build_Packager_C',
  //     );

  //     expect(solution?.result.Status).toBe('Optimal');
  //     console.log(packagersNode);
  //     expect(packagersNode).toHaveLength(0);
  //   });
});
