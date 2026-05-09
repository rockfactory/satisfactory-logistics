import { describe, expect, test } from 'vitest';
import { itemId } from '@/recipes/itemId';
import { loadHighs, solveProduction } from '@/solver/algorithm/solveProduction';

describe('preferDeclaredInput', () => {
  test('uses declared non-world input instead of producing it from raw resources', async () => {
    const highs = await loadHighs();
    const solution = solveProduction(highs, {
      inputs: [{ amount: 300, resource: itemId('Desc_Wire_C') }],
      outputs: [{ amount: 100, resource: itemId('Desc_Cable_C') }],
    });

    expect(solution?.result.Status).toBe('Optimal');

    const wireRecipeNodes = solution?.nodes.filter(
      n =>
        n.type === 'Machine' &&
        n.data.recipe?.products.some(p => p.resource === itemId('Desc_Wire_C')),
    );
    expect(wireRecipeNodes).toHaveLength(0);

    const wireInputNode = solution?.nodes.find(
      n =>
        n.type === 'Resource' &&
        n.data.resource.id === itemId('Desc_Wire_C') &&
        n.data.input != null,
    );
    expect(wireInputNode).toBeDefined();
    if (wireInputNode?.type === 'Resource') {
      expect(wireInputNode.data.value).toBeCloseTo(200, 5);
    }
  });

  test('Heavy Modular Frame factory uses declared Wire input instead of Iron Wire alt', async () => {
    const highs = await loadHighs();
    const solution = solveProduction(highs, {
      inputs: [
        { amount: 73.3334, resource: itemId('Desc_Cement_C') },
        { amount: 33.3334, resource: itemId('Desc_SteelPlateReinforced_C') },
        { amount: 85, resource: itemId('Desc_SteelIngot_C') },
        { amount: 120, resource: itemId('Desc_SteelPipe_C') },
        { amount: 266.667, resource: itemId('Desc_Wire_C') },
        { amount: 45, resource: itemId('Desc_IronIngot_C') },
      ],
      outputs: [{ amount: 10, resource: itemId('Desc_ModularFrameHeavy_C') }],
    });

    expect(solution?.result.Status).toBe('Optimal');

    const wireInputNode = solution?.nodes.find(
      n =>
        n.type === 'Resource' &&
        n.data.resource.id === itemId('Desc_Wire_C') &&
        n.data.input != null,
    );
    expect(wireInputNode).toBeDefined();
    if (wireInputNode?.type === 'Resource') {
      expect(wireInputNode.data.value).toBeGreaterThan(260);
    }

    const wireProducingRecipes =
      solution?.nodes.filter(
        n =>
          n.type === 'Machine' &&
          n.data.recipe?.products.some(
            p => p.resource === itemId('Desc_Wire_C'),
          ),
      ) ?? [];
    expect(wireProducingRecipes).toHaveLength(0);
  });

  test('tiny output: only the needed amount of declared input is consumed', async () => {
    const highs = await loadHighs();
    const solution = solveProduction(highs, {
      inputs: [{ amount: 1000, resource: itemId('Desc_Wire_C') }],
      outputs: [{ amount: 0.5, resource: itemId('Desc_Cable_C') }],
    });

    expect(solution?.result.Status).toBe('Optimal');
    const wireInput = solution?.nodes.find(
      n =>
        n.type === 'Resource' &&
        n.data.resource.id === itemId('Desc_Wire_C') &&
        n.data.input != null,
    );
    expect(wireInput).toBeDefined();
    if (wireInput?.type === 'Resource') {
      expect(wireInput.data.value).toBeCloseTo(1, 5);
    }
    const wireProducers =
      solution?.nodes.filter(
        n =>
          n.type === 'Machine' &&
          n.data.recipe?.products.some(
            p => p.resource === itemId('Desc_Wire_C'),
          ),
      ) ?? [];
    expect(wireProducers).toHaveLength(0);
  });

  test('huge output: declared input is consumed up to the cap, recipes top up the rest', async () => {
    const highs = await loadHighs();
    const solution = solveProduction(highs, {
      inputs: [{ amount: 100, resource: itemId('Desc_Wire_C') }],
      outputs: [{ amount: 10_000, resource: itemId('Desc_Cable_C') }],
    });

    expect(solution?.result.Status).toBe('Optimal');
    const wireInput = solution?.nodes.find(
      n =>
        n.type === 'Resource' &&
        n.data.resource.id === itemId('Desc_Wire_C') &&
        n.data.input != null,
    );
    expect(wireInput).toBeDefined();
    if (wireInput?.type === 'Resource') {
      expect(wireInput.data.value).toBeCloseTo(100, 3);
    }
    const wireProducers =
      solution?.nodes.filter(
        n =>
          n.type === 'Machine' &&
          n.data.recipe?.products.some(
            p => p.resource === itemId('Desc_Wire_C'),
          ),
      ) ?? [];
    expect(wireProducers.length).toBeGreaterThan(0);
  });

  test('huge declared input + huge output: still saturates declared and avoids raw', async () => {
    const highs = await loadHighs();
    const solution = solveProduction(highs, {
      inputs: [{ amount: 1_000_000, resource: itemId('Desc_Wire_C') }],
      outputs: [{ amount: 100_000, resource: itemId('Desc_Cable_C') }],
    });

    expect(solution?.result.Status).toBe('Optimal');
    const wireInput = solution?.nodes.find(
      n =>
        n.type === 'Resource' &&
        n.data.resource.id === itemId('Desc_Wire_C') &&
        n.data.input != null,
    );
    expect(wireInput).toBeDefined();
    if (wireInput?.type === 'Resource') {
      expect(wireInput.data.value).toBeCloseTo(200_000, 0);
    }
    const wireProducers =
      solution?.nodes.filter(
        n =>
          n.type === 'Machine' &&
          n.data.recipe?.products.some(
            p => p.resource === itemId('Desc_Wire_C'),
          ),
      ) ?? [];
    expect(wireProducers).toHaveLength(0);
  });

  test('inverse: declared input not in consumption path is not consumed', async () => {
    const highs = await loadHighs();
    const solution = solveProduction(highs, {
      inputs: [
        { amount: 50, resource: itemId('Desc_IronIngot_C') },
        { amount: 100, resource: itemId('Desc_Stone_C') },
      ],
      outputs: [{ amount: 20, resource: itemId('Desc_Cement_C') }],
    });

    expect(solution?.result.Status).toBe('Optimal');
    const ironInputNode = solution?.nodes.find(
      n =>
        n.type === 'Resource' &&
        n.data.resource.id === itemId('Desc_IronIngot_C') &&
        n.data.input != null,
    );
    if (ironInputNode?.type === 'Resource') {
      expect(ironInputNode.data.value).toBe(0);
    }
  });

  test('inverse: multiple declared inputs of the same resource are not double-counted', async () => {
    const highs = await loadHighs();
    const solution = solveProduction(highs, {
      inputs: [
        { amount: 60, resource: itemId('Desc_Wire_C') },
        { amount: 60, resource: itemId('Desc_Wire_C') },
      ],
      outputs: [{ amount: 50, resource: itemId('Desc_Cable_C') }],
    });

    expect(solution?.result.Status).toBe('Optimal');

    const wireInputs =
      solution?.nodes.filter(
        n =>
          n.type === 'Resource' &&
          n.data.resource.id === itemId('Desc_Wire_C') &&
          n.data.input != null,
      ) ?? [];
    expect(wireInputs).toHaveLength(2);
    const totalDeclared = wireInputs.reduce(
      (acc, n) => (n.type === 'Resource' ? acc + n.data.value : acc),
      0,
    );
    expect(totalDeclared).toBeCloseTo(100, 5);

    const wireProducers =
      solution?.nodes.filter(
        n =>
          n.type === 'Machine' &&
          n.data.recipe?.products.some(
            p => p.resource === itemId('Desc_Wire_C'),
          ),
      ) ?? [];
    expect(wireProducers).toHaveLength(0);
  });

  test('inverse: declared input below demand falls back to raw production for the rest', async () => {
    const highs = await loadHighs();
    const solution = solveProduction(highs, {
      inputs: [{ amount: 50, resource: itemId('Desc_Wire_C') }],
      outputs: [{ amount: 50, resource: itemId('Desc_Cable_C') }],
    });

    expect(solution?.result.Status).toBe('Optimal');

    const wireInput = solution?.nodes.find(
      n =>
        n.type === 'Resource' &&
        n.data.resource.id === itemId('Desc_Wire_C') &&
        n.data.input != null,
    );
    expect(wireInput).toBeDefined();
    if (wireInput?.type === 'Resource') {
      expect(wireInput.data.value).toBeCloseTo(50, 5);
    }

    const wireProducers =
      solution?.nodes.filter(
        n =>
          n.type === 'Machine' &&
          n.data.recipe?.products.some(
            p => p.resource === itemId('Desc_Wire_C'),
          ),
      ) ?? [];
    expect(wireProducers.length).toBeGreaterThan(0);
  });

  test('inverse: zero raw extraction when declared inputs cover the full demand', async () => {
    const highs = await loadHighs();
    const solution = solveProduction(highs, {
      inputs: [{ amount: 100, resource: itemId('Desc_Wire_C') }],
      outputs: [{ amount: 50, resource: itemId('Desc_Cable_C') }],
    });

    expect(solution?.result.Status).toBe('Optimal');

    const rawNodes =
      solution?.nodes.filter(
        n => n.type === 'Resource' && n.data.input == null,
      ) ?? [];
    for (const n of rawNodes) {
      if (n.type === 'Resource') {
        expect(n.data.value).toBe(0);
      }
    }
  });

  test('extremely tiny declared input still wins over raw production', async () => {
    const highs = await loadHighs();
    const solution = solveProduction(highs, {
      inputs: [{ amount: 0.01, resource: itemId('Desc_Wire_C') }],
      outputs: [{ amount: 0.001, resource: itemId('Desc_Cable_C') }],
    });

    expect(solution?.result.Status).toBe('Optimal');
    const wireInput = solution?.nodes.find(
      n =>
        n.type === 'Resource' &&
        n.data.resource.id === itemId('Desc_Wire_C') &&
        n.data.input != null,
    );
    expect(wireInput).toBeDefined();
    if (wireInput?.type === 'Resource') {
      expect(wireInput.data.value).toBeCloseTo(0.002, 6);
    }
    const wireProducers =
      solution?.nodes.filter(
        n =>
          n.type === 'Machine' &&
          n.data.recipe?.products.some(
            p => p.resource === itemId('Desc_Wire_C'),
          ),
      ) ?? [];
    expect(wireProducers).toHaveLength(0);
  });
});
