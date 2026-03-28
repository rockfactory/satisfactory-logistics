import { describe, expect, test } from 'vitest';
import { calculateSplitterNetwork } from './splitRatios';
import type { SplitterRequest, SplitterResult } from './types';

function makeRequest(
  sources: { rate: number; count: number }[],
  targets: { rate: number; count: number }[],
  maxBeltSpeed = 1200,
  useDecomposition = false,
): SplitterRequest {
  return {
    sources,
    targets,
    maxBeltSpeed,
    allowSmartSplitters: false,
    useDecomposition,
  };
}

/**
 * Validate that every splitter node has equal output rates.
 * In Satisfactory, a splitter with N outputs always divides evenly.
 */
function assertSplittersHaveEqualOutputs(result: SplitterResult) {
  for (const node of result.nodes) {
    if (node.type !== 'splitter') continue;
    if (node.children.length <= 1) continue;

    const rates = node.children.map(l => l.carrying);
    const first = rates[0];
    for (let i = 1; i < rates.length; i++) {
      expect(
        Math.abs(rates[i] - first),
        `Splitter ${node.id} has unequal outputs: ${rates.join(', ')}`,
      ).toBeLessThan(0.01);
    }
  }
}

/**
 * Validate that no belt (link) exceeds the max belt speed.
 */
function assertBeltsWithinSpeed(result: SplitterResult, maxBeltSpeed: number) {
  for (const link of result.links) {
    expect(
      link.carrying,
      `Belt ${link.from.id} → ${link.to.id} carries ${link.carrying}/min, exceeds max ${maxBeltSpeed}`,
    ).toBeLessThanOrEqual(maxBeltSpeed + 0.01);
  }
}

/**
 * Validate that every target node receives the expected rate.
 */
function assertTargetsReceiveCorrectRates(
  result: SplitterResult,
  expectedRates: number[],
) {
  const targetNodes = result.nodes.filter(
    n => n.type === 'target' && !n.label?.startsWith('Leftover'),
  );
  expect(targetNodes.length).toBe(expectedRates.length);

  const actualRates = targetNodes
    .map(n => {
      const incomingRate = n.parents.reduce((sum, l) => sum + l.carrying, 0);
      return Math.round(incomingRate * 1000) / 1000;
    })
    .sort((a, b) => a - b);

  const sorted = [...expectedRates].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    expect(
      Math.abs(actualRates[i] - sorted[i]),
      `Target rate mismatch: expected ${sorted[i]}, got ${actualRates[i]}`,
    ).toBeLessThan(0.01);
  }
}

/**
 * Validate no error was returned.
 */
function assertNoError(result: SplitterResult) {
  expect(result.error).toBeUndefined();
}

function runStandardAssertions(
  result: SplitterResult,
  expectedTargetRates: number[],
  maxBeltSpeed: number,
) {
  assertNoError(result);
  assertSplittersHaveEqualOutputs(result);
  assertBeltsWithinSpeed(result, maxBeltSpeed);
  assertTargetsReceiveCorrectRates(result, expectedTargetRates);
}

describe('splitter calculator', () => {
  describe('legacy algorithm', () => {
    test('6x1200 → 10x720: non-smooth split with belt speed constraint', () => {
      const request = makeRequest(
        [{ rate: 1200, count: 6 }],
        [{ rate: 720, count: 10 }],
      );
      const result = calculateSplitterNetwork(request);
      runStandardAssertions(result, Array(10).fill(720), 1200);
    });

    test('1x780 → 3x260: clean 3-way split', () => {
      const request = makeRequest(
        [{ rate: 780, count: 1 }],
        [{ rate: 260, count: 3 }],
      );
      const result = calculateSplitterNetwork(request);
      runStandardAssertions(result, Array(3).fill(260), 1200);
    });

    test('1x480 → 2x240: clean 2-way split', () => {
      const request = makeRequest(
        [{ rate: 480, count: 1 }],
        [{ rate: 240, count: 2 }],
      );
      const result = calculateSplitterNetwork(request);
      runStandardAssertions(result, Array(2).fill(240), 1200);
    });

    test('1x600 → 5x120: non-smooth count (5 outputs)', () => {
      const request = makeRequest(
        [{ rate: 600, count: 1 }],
        [{ rate: 120, count: 5 }],
      );
      const result = calculateSplitterNetwork(request);
      runStandardAssertions(result, Array(5).fill(120), 1200);
    });

    test('2x1200 → 5x480: multiple sources, non-smooth target count', () => {
      const request = makeRequest(
        [{ rate: 1200, count: 2 }],
        [{ rate: 480, count: 5 }],
      );
      const result = calculateSplitterNetwork(request);
      runStandardAssertions(result, Array(5).fill(480), 1200);
    });

    test('1x1200 → 4x300: even split (4 = 2x2)', () => {
      const request = makeRequest(
        [{ rate: 1200, count: 1 }],
        [{ rate: 300, count: 4 }],
      );
      const result = calculateSplitterNetwork(request);
      runStandardAssertions(result, Array(4).fill(300), 1200);
    });

    test('3x480 → 4x360: unequal source/target counts', () => {
      const request = makeRequest(
        [{ rate: 480, count: 3 }],
        [{ rate: 360, count: 4 }],
      );
      const result = calculateSplitterNetwork(request);
      runStandardAssertions(result, Array(4).fill(360), 1200);
    });

    test('1x270 → 9x30: large smooth split (9 = 3x3)', () => {
      const request = makeRequest(
        [{ rate: 270, count: 1 }],
        [{ rate: 30, count: 9 }],
      );
      const result = calculateSplitterNetwork(request);
      runStandardAssertions(result, Array(9).fill(30), 1200);
    });

    test('lower max belt speed constraint', () => {
      const request = makeRequest(
        [{ rate: 480, count: 2 }],
        [{ rate: 120, count: 8 }],
        480,
      );
      const result = calculateSplitterNetwork(request);
      runStandardAssertions(result, Array(8).fill(120), 480);
    });

    test('leftover flow produces a leftover target', () => {
      const request = makeRequest(
        [{ rate: 480, count: 1 }],
        [{ rate: 120, count: 3 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertSplittersHaveEqualOutputs(result);

      const leftoverTargets = result.nodes.filter(
        n => n.type === 'target' && n.label?.startsWith('Leftover'),
      );
      expect(leftoverTargets.length).toBe(1);
    });
  });

  describe('decomposition algorithm', () => {
    test('6x1200 → 10x720: decomposition path', () => {
      const request = makeRequest(
        [{ rate: 1200, count: 6 }],
        [{ rate: 720, count: 10 }],
        1200,
        true,
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertTargetsReceiveCorrectRates(result, Array(10).fill(720));
    });
  });

  describe('mixed-rate source routing', () => {
    test('1050+750+600 → 2×1200: should minimize splitting when sources nearly match targets', () => {
      const request = makeRequest(
        [
          { rate: 1050, count: 1 },
          { rate: 750, count: 1 },
          { rate: 600, count: 1 },
        ],
        [{ rate: 1200, count: 2 }],
      );
      const result = calculateSplitterNetwork(request);
      runStandardAssertions(result, [1200, 1200], 1200);

      const splitters = result.nodes.filter(n => n.type === 'splitter');
      const mergers = result.nodes.filter(n => n.type === 'merger');
      // Flow assignment routes: 1050 + 150(from 750) → T1, 600(from 750) + 600 → T2
      // Splitting 750 into 1:4 ratio needs loop-back (5 isn't 3-smooth),
      // so ~8 internal nodes. Far better than the 18 from unit-rate atomization.
      expect(
        splitters.length + mergers.length,
        `Too many internal nodes: ${splitters.length} splitters + ${mergers.length} mergers. ` +
          `Nodes: ${result.nodes.map(n => `${n.id}(${n.type}:${n.holding})`).join(', ')}`,
      ).toBeLessThanOrEqual(10);
    });

    test('480+480 → 1×960: two sources merge directly without splitting', () => {
      const request = makeRequest(
        [{ rate: 480, count: 2 }],
        [{ rate: 960, count: 1 }],
      );
      const result = calculateSplitterNetwork(request);
      runStandardAssertions(result, [960], 1200);

      const splitters = result.nodes.filter(n => n.type === 'splitter');
      expect(splitters.length).toBe(0);
    });

    test('1100+100 → 1×1200: near-exact pair merges directly', () => {
      const request = makeRequest(
        [
          { rate: 1100, count: 1 },
          { rate: 100, count: 1 },
        ],
        [{ rate: 1200, count: 1 }],
      );
      const result = calculateSplitterNetwork(request);
      runStandardAssertions(result, [1200], 1200);

      const splitters = result.nodes.filter(n => n.type === 'splitter');
      const mergers = result.nodes.filter(n => n.type === 'merger');
      expect(splitters.length + mergers.length).toBeLessThanOrEqual(2);
    });

    test('600+600 → 2×300+1×600: some sources route directly, others split', () => {
      const request = makeRequest(
        [{ rate: 600, count: 2 }],
        [
          { rate: 300, count: 2 },
          { rate: 600, count: 1 },
        ],
      );
      const result = calculateSplitterNetwork(request);
      runStandardAssertions(result, [300, 300, 600], 1200);
    });
  });

  describe('smart splitter partitioning', () => {
    function makeSmartRequest(
      sources: { rate: number; count: number }[],
      targets: { rate: number; count: number }[],
      maxBeltSpeed = 1200,
    ): SplitterRequest {
      return {
        sources,
        targets,
        maxBeltSpeed,
        allowSmartSplitters: true,
        useDecomposition: false,
      };
    }

    test('1x1200 → 10x120: partitions into [6,4] groups via smart splitter', () => {
      const request = makeSmartRequest(
        [{ rate: 1200, count: 1 }],
        [{ rate: 120, count: 10 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertBeltsWithinSpeed(result, 1200);
      assertTargetsReceiveCorrectRates(result, Array(10).fill(120));

      const smartSplitters = result.nodes.filter(
        n => n.type === 'smart_splitter',
      );
      expect(smartSplitters.length).toBe(1);

      const mergers = result.nodes.filter(n => n.type === 'merger');
      expect(mergers.length).toBe(0);
    });

    test('1x1200 → 5x240: count 5 partitions into [3,2] groups', () => {
      const request = makeSmartRequest(
        [{ rate: 1200, count: 1 }],
        [{ rate: 240, count: 5 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertBeltsWithinSpeed(result, 1200);
      assertTargetsReceiveCorrectRates(result, Array(5).fill(240));

      const smartSplitters = result.nodes.filter(
        n => n.type === 'smart_splitter',
      );
      expect(smartSplitters.length).toBe(1);
    });

    test('1x1200 → 4x300: count 4 is already 3-smooth, no smart splitter used', () => {
      const request = makeSmartRequest(
        [{ rate: 1200, count: 1 }],
        [{ rate: 300, count: 4 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertTargetsReceiveCorrectRates(result, Array(4).fill(300));

      const smartSplitters = result.nodes.filter(
        n => n.type === 'smart_splitter',
      );
      expect(smartSplitters.length).toBe(0);
    });

    test('1x780 → 7x111.43: count 7 partitions into [4,3] groups', () => {
      const rate = 780 / 7;
      const request = makeSmartRequest(
        [{ rate: 780, count: 1 }],
        [{ rate: rate, count: 7 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertBeltsWithinSpeed(result, 1200);

      const smartSplitters = result.nodes.filter(
        n => n.type === 'smart_splitter',
      );
      expect(smartSplitters.length).toBe(1);
    });
  });

  describe('error cases', () => {
    test('targets exceed sources', () => {
      const request = makeRequest(
        [{ rate: 100, count: 1 }],
        [{ rate: 200, count: 1 }],
      );
      const result = calculateSplitterNetwork(request);
      expect(result.error).toBeDefined();
    });

    test('no sources', () => {
      const request = makeRequest([], [{ rate: 100, count: 1 }]);
      const result = calculateSplitterNetwork(request);
      expect(result.error).toBeDefined();
    });

    test('no targets', () => {
      const request = makeRequest([{ rate: 100, count: 1 }], []);
      const result = calculateSplitterNetwork(request);
      expect(result.error).toBeDefined();
    });
  });
});
