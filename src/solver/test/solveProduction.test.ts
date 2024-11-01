import { describe, expect, test } from 'vitest';
import { loadHighs, solveProduction } from '../algorithm/solveProduction';

describe('solveProduction', () => {
  test('inputs should not change production plan', async () => {
    const highs = await loadHighs();
    const solution = solveProduction(highs, {
      inputs: [],
      outputs: [
        { amount: 10, resource: 'Desc_FicsiteIngot_C' }, // Biochemical Sculptor
      ],
    });
    const reanimatedNode = solution?.nodes.find(
      n => n.type === 'Machine' && n.data.resource.id === 'Desc_SAMIngot_C',
    );
    // console.log(solution?.nodes);

    expect(solution?.result.Status).toBe('Optimal');
    expect(reanimatedNode?.data.value).toBe(20);

    const solutionWithInputs = solveProduction(highs, {
      inputs: [
        { amount: 20, resource: 'Desc_SAMIngot_C' }, // Biochemical Sculptor
      ],
      outputs: [
        { amount: 10, resource: 'Desc_FicsiteIngot_C' }, // Biochemical Sculptor
      ],
    });
    const reanimatedNodeWithInputs = solutionWithInputs?.nodes.find(
      n => n.type === 'Resource' && n.data.resource.id === 'Desc_SAMIngot_C',
    );
    console.log(solutionWithInputs?.nodes);
    // console.log(solutionWithInputs?.nodes);
    expect(solutionWithInputs?.result.Status).toBe('Optimal');
    expect(reanimatedNodeWithInputs?.data.value).toBe(20);
  });
});
