import { getAllDefaultRecipesIds } from '@/recipes/graph/getAllDefaultRecipes';
import type { FactoryItemId } from '@/recipes/FactoryItemId';
import { itemId } from '@/recipes/itemId';
import { loadHighs, solveProduction } from '@/solver/algorithm/solveProduction';
import type { IMachineNodeData } from '@/solver/layout/nodes/machine-node/MachineNode';
import { describe, expect, test } from 'vitest';

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

  test('somersloops on intermediate recipe should increase maximized output', async () => {
    const highs = await loadHighs();

    const POWER_ID = 'Desc_Power_CX' as FactoryItemId;

    const baseConfig = {
      inputs: [
        { resource: itemId('Desc_PackagedRocketFuel_C'), amount: 240 },
        { resource: itemId('Desc_DarkMatter_C'), amount: 80 },
      ],
      outputs: [
        {
          resource: POWER_ID,
          amount: 0,
          objective: 'max' as const,
        },
      ],
      allowedRecipes: [
        'Recipe_Alternate_IonizedFuel_Dark_C',
        'RecipeCustom_Build_GeneratorFuel_C_Desc_IonizedFuel_C',
      ],
    };

    // Without somersloops
    const baseline = solveProduction(highs, baseConfig);
    expect(baseline?.result.Status).toBe('Optimal');

    const baselinePower = baseline?.nodes.find(
      n => n.type === 'Byproduct' && n.data.resource.id === POWER_ID,
    );
    expect(baselinePower).toBeDefined();
    expect(baselinePower!.data.value).toBeGreaterThan(0);

    // With somersloops on Dark-Ion Fuel (Converter, 2 slots, full fill)
    // Node ID: p{ionizedFuelIndex=34}r{darkIonRecipeIndex=118}
    const slooped = solveProduction(highs, {
      ...baseConfig,
      nodes: {
        p34r118: { somersloops: 2 },
      },
    });
    expect(slooped?.result.Status).toBe('Optimal');

    const sloopedPower = slooped?.nodes.find(
      n => n.type === 'Byproduct' && n.data.resource.id === POWER_ID,
    );
    expect(sloopedPower).toBeDefined();

    // With somersloops doubling Ionized Fuel production from the same inputs,
    // more fuel is available for generators → power should increase
    expect(sloopedPower!.data.value).toBeGreaterThan(baselinePower!.data.value);
  });

  test('somersloops on intermediate recipe should increase maximized output (exact inputs)', async () => {
    const highs = await loadHighs();

    const POWER_ID = 'Desc_Power_CX' as FactoryItemId;

    const baseConfig = {
      inputs: [
        {
          resource: itemId('Desc_PackagedRocketFuel_C'),
          amount: 240,
          constraint: 'exact' as const,
        },
        {
          resource: itemId('Desc_DarkMatter_C'),
          amount: 80,
          constraint: 'exact' as const,
        },
      ],
      outputs: [
        {
          resource: POWER_ID,
          amount: 0,
          objective: 'max' as const,
        },
      ],
      allowedRecipes: [
        'Recipe_Alternate_IonizedFuel_Dark_C',
        'RecipeCustom_Build_GeneratorFuel_C_Desc_IonizedFuel_C',
      ],
    };

    // Without somersloops
    const baseline = solveProduction(highs, baseConfig);
    expect(baseline?.result.Status).toBe('Optimal');

    const baselinePower = baseline?.nodes.find(
      n => n.type === 'Byproduct' && n.data.resource.id === POWER_ID,
    );
    expect(baselinePower).toBeDefined();
    expect(baselinePower!.data.value).toBeGreaterThan(0);

    // With somersloops on Dark-Ion Fuel (Converter, 2 slots, full fill)
    const slooped = solveProduction(highs, {
      ...baseConfig,
      nodes: {
        p34r118: { somersloops: 2 },
      },
    });
    expect(slooped?.result.Status).toBe('Optimal');

    const sloopedPower = slooped?.nodes.find(
      n => n.type === 'Byproduct' && n.data.resource.id === POWER_ID,
    );
    expect(sloopedPower).toBeDefined();

    // Same exact inputs, but somersloops double the output → power should double
    expect(sloopedPower!.data.value).toBeGreaterThan(baselinePower!.data.value);
  });

  test('somersloops on intermediate recipe with mixed exact+max outputs', async () => {
    const highs = await loadHighs();

    const POWER_ID = 'Desc_Power_CX' as FactoryItemId;

    const baseConfig = {
      inputs: [
        {
          resource: itemId('Desc_PackagedRocketFuel_C'),
          amount: 240,
          constraint: 'exact' as const,
        },
        {
          resource: itemId('Desc_DarkMatter_C'),
          amount: 80,
          constraint: 'exact' as const,
        },
      ],
      outputs: [
        {
          resource: POWER_ID,
          amount: 0,
          objective: 'max' as const,
        },
        // Compacted Coal is a byproduct of Dark-Ion Fuel
        {
          resource: itemId('Desc_CompactedCoal_C'),
          amount: 40,
          objective: 'default' as const,
        },
      ],
      allowedRecipes: [
        'Recipe_Alternate_IonizedFuel_Dark_C',
        'RecipeCustom_Build_GeneratorFuel_C_Desc_IonizedFuel_C',
      ],
    };

    // Without somersloops
    const baseline = solveProduction(highs, baseConfig);
    expect(baseline?.result.Status).toBe('Optimal');

    const baselinePower = baseline?.nodes.find(
      n => n.type === 'Byproduct' && n.data.resource.id === POWER_ID,
    );

    // With somersloops
    const slooped = solveProduction(highs, {
      ...baseConfig,
      nodes: {
        p34r118: { somersloops: 2 },
      },
    });
    expect(slooped?.result.Status).toBe('Optimal');

    const sloopedPower = slooped?.nodes.find(
      n => n.type === 'Byproduct' && n.data.resource.id === POWER_ID,
    );

    expect(sloopedPower!.data.value).toBeGreaterThan(baselinePower!.data.value);
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
