import { describe, expect, test } from 'vitest';
import { calculateSplitterNetwork } from './splitRatios';
import type { SplitterRequest, SplitterResult } from './types';

function makeRequest(
  sources: { rate: number; count: number }[],
  targets: { rate: number; count: number }[],
  maxBeltSpeed = 1200,
): SplitterRequest {
  return {
    sources,
    targets,
    maxBeltSpeed,
    allowSmartSplitters: false,
  };
}

const BELT_SPEEDS = new Set([60, 120, 270, 480, 780, 1200]);

/**
 * Validate that every splitter node has equal output rates,
 * unless it is a belt-capped splitter (2 outputs where one
 * matches a belt tier speed — models backpressure limiting).
 */
function assertSplittersHaveEqualOutputs(result: SplitterResult) {
  for (const node of result.nodes) {
    if (node.type !== 'splitter') continue;
    if (node.children.length <= 1) continue;

    const rates = node.children.map(l => l.carrying);

    // Allow belt-capped splitters: exactly 2 outputs where at least
    // one rate matches a belt tier speed (backpressure-limited tap)
    if (rates.length === 2) {
      const isBeltCapped = rates.some(r => BELT_SPEEDS.has(Math.round(r)));
      if (isBeltCapped) continue;
    }

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

  describe('complexity budget and approximate solutions', () => {
    test('1200x2+233x1 → 600x4: does not produce bloated network', () => {
      const request = makeRequest(
        [
          { rate: 1200, count: 2 },
          { rate: 233, count: 1 },
        ],
        [{ rate: 600, count: 4 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);

      const internalNodes = result.nodes.filter(
        n => n.type !== 'source' && n.type !== 'target',
      );
      expect(
        internalNodes.length,
        `Too many internal nodes (${internalNodes.length}). Network is bloated.`,
      ).toBeLessThanOrEqual(20);
    });

    test('1200x1 → 233x5: prime rate uses approximation to stay simple', () => {
      const request = makeRequest(
        [{ rate: 1200, count: 1 }],
        [{ rate: 233, count: 5 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);

      const internalNodes = result.nodes.filter(
        n => n.type !== 'source' && n.type !== 'target',
      );
      expect(
        internalNodes.length,
        `Too many internal nodes (${internalNodes.length}). Approximation should simplify this.`,
      ).toBeLessThanOrEqual(30);

      if (result.approximations && result.approximations.length > 0) {
        for (const approx of result.approximations) {
          expect(
            Math.abs(approx.deviation),
            `Deviation ${approx.deviation} exceeds 5%`,
          ).toBeLessThanOrEqual(0.05);
        }
      }
    });

    test('prime-rate target produces approximation with deviation flag', () => {
      const request = makeRequest(
        [{ rate: 1200, count: 1 }],
        [{ rate: 137, count: 7 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);

      if (result.approximations) {
        for (const approx of result.approximations) {
          expect(Math.abs(approx.deviation)).toBeLessThanOrEqual(0.05);
          expect(approx.actualRate).not.toBe(approx.requestedRate);
        }
      }

      const internalNodes = result.nodes.filter(
        n => n.type !== 'source' && n.type !== 'target',
      );
      expect(
        internalNodes.length,
        `Too many internal nodes (${internalNodes.length}).`,
      ).toBeLessThanOrEqual(100);
    });

    test('clean rates are not approximated', () => {
      const request = makeRequest(
        [{ rate: 1200, count: 1 }],
        [{ rate: 400, count: 3 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      expect(result.approximations).toBeUndefined();
      assertTargetsReceiveCorrectRates(result, Array(3).fill(400));
    });

    test('flow assignment handles mixed sources efficiently', () => {
      const request = makeRequest(
        [
          { rate: 1200, count: 1 },
          { rate: 600, count: 1 },
        ],
        [{ rate: 600, count: 3 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertTargetsReceiveCorrectRates(result, Array(3).fill(600));

      const splitters = result.nodes.filter(n => n.type === 'splitter');
      expect(
        splitters.length,
        'Should need at most 1 splitter (split 1200 into 2x600)',
      ).toBeLessThanOrEqual(1);
    });
  });

  describe('leftover handling', () => {
    test('2x600 → 1x1000: leftover 200 routed to separate target', () => {
      const request = makeRequest(
        [{ rate: 600, count: 2 }],
        [{ rate: 1000, count: 1 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertBeltsWithinSpeed(result, 1200);
      assertTargetsReceiveCorrectRates(result, [1000]);

      const leftoverTargets = result.nodes.filter(
        n => n.type === 'target' && n.label?.startsWith('Leftover'),
      );
      expect(leftoverTargets.length).toBe(1);
      const leftoverRate = leftoverTargets[0].parents.reduce(
        (sum, l) => sum + l.carrying,
        0,
      );
      expect(Math.abs(leftoverRate - 200)).toBeLessThan(0.01);
    });

    test('exact match produces no leftover target', () => {
      const request = makeRequest(
        [{ rate: 600, count: 2 }],
        [{ rate: 400, count: 3 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertTargetsReceiveCorrectRates(result, Array(3).fill(400));

      const leftoverTargets = result.nodes.filter(
        n => n.type === 'target' && n.label?.startsWith('Leftover'),
      );
      expect(leftoverTargets.length).toBe(0);
    });

    test('large leftover: 1x1200 → 1x120 leaves 1080', () => {
      const request = makeRequest(
        [{ rate: 1200, count: 1 }],
        [{ rate: 120, count: 1 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertTargetsReceiveCorrectRates(result, [120]);

      const leftoverTargets = result.nodes.filter(
        n => n.type === 'target' && n.label?.startsWith('Leftover'),
      );
      expect(leftoverTargets.length).toBe(1);
    });
  });

  describe('belt speed constraints', () => {
    test('mk3 belt speed (270) constrains all links', () => {
      const request = makeRequest(
        [{ rate: 270, count: 1 }],
        [{ rate: 90, count: 3 }],
        270,
      );
      const result = calculateSplitterNetwork(request);
      runStandardAssertions(result, Array(3).fill(90), 270);
    });

    test('mk1 belt speed (60) with small rates', () => {
      const request = makeRequest(
        [{ rate: 60, count: 1 }],
        [{ rate: 20, count: 3 }],
        60,
      );
      const result = calculateSplitterNetwork(request);
      runStandardAssertions(result, Array(3).fill(20), 60);
    });

    test('multiple sources at mk5 (780)', () => {
      const request = makeRequest(
        [{ rate: 780, count: 2 }],
        [{ rate: 520, count: 3 }],
        780,
      );
      const result = calculateSplitterNetwork(request);
      runStandardAssertions(result, Array(3).fill(520), 780);
    });
  });

  describe('graph invariants', () => {
    test('every non-source node has at least one parent', () => {
      const request = makeRequest(
        [{ rate: 1200, count: 2 }],
        [{ rate: 480, count: 5 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);

      for (const node of result.nodes) {
        if (node.type === 'source') continue;
        expect(
          node.parents.length,
          `Non-source node ${node.id} (${node.type}) has no parents`,
        ).toBeGreaterThanOrEqual(1);
      }
    });

    test('every non-target node has at least one child', () => {
      const request = makeRequest(
        [{ rate: 1200, count: 2 }],
        [{ rate: 480, count: 5 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);

      for (const node of result.nodes) {
        if (node.type === 'target') continue;
        expect(
          node.children.length,
          `Non-target node ${node.id} (${node.type}) has no children`,
        ).toBeGreaterThanOrEqual(1);
      }
    });

    test('source nodes have no parents', () => {
      const request = makeRequest(
        [{ rate: 600, count: 3 }],
        [{ rate: 400, count: 3 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);

      const sourceNodes = result.nodes.filter(n => n.type === 'source');
      for (const node of sourceNodes) {
        expect(node.parents.length).toBe(0);
      }
    });

    test('target nodes have no children', () => {
      const request = makeRequest(
        [{ rate: 600, count: 3 }],
        [{ rate: 400, count: 3 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);

      const targetNodes = result.nodes.filter(n => n.type === 'target');
      for (const node of targetNodes) {
        expect(node.children.length).toBe(0);
      }
    });

    test('total flow is conserved (sources sum = targets sum)', () => {
      const request = makeRequest(
        [{ rate: 1200, count: 3 }],
        [{ rate: 720, count: 5 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);

      const sourceTotal = result.nodes
        .filter(n => n.type === 'source')
        .reduce((sum, n) => sum + n.holding, 0);
      const targetTotal = result.nodes
        .filter(n => n.type === 'target')
        .reduce(
          (sum, n) => sum + n.parents.reduce((s, l) => s + l.carrying, 0),
          0,
        );

      expect(
        Math.abs(sourceTotal - targetTotal),
        `Flow not conserved: sources=${sourceTotal}, targets=${targetTotal}`,
      ).toBeLessThan(0.01);
    });

    test('no passthrough nodes remain (1 in, 1 out splitter/merger)', () => {
      const request = makeRequest(
        [{ rate: 1200, count: 1 }],
        [{ rate: 400, count: 3 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);

      for (const node of result.nodes) {
        if (node.type === 'source' || node.type === 'target') continue;
        const isPassthrough =
          node.parents.length === 1 && node.children.length === 1;
        expect(
          isPassthrough,
          `Node ${node.id} (${node.type}) is a passthrough (1 in, 1 out)`,
        ).toBe(false);
      }
    });

    test('splitter outputs do not exceed 3', () => {
      const request = makeRequest(
        [{ rate: 1200, count: 1 }],
        [{ rate: 150, count: 8 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);

      for (const node of result.nodes) {
        if (node.type !== 'splitter') continue;
        expect(
          node.children.length,
          `Splitter ${node.id} has ${node.children.length} outputs (max 3)`,
        ).toBeLessThanOrEqual(3);
      }
    });

    test('merger inputs do not exceed 3', () => {
      const request = makeRequest(
        [{ rate: 300, count: 4 }],
        [{ rate: 1200, count: 1 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);

      for (const node of result.nodes) {
        if (node.type !== 'merger') continue;
        expect(
          node.parents.length,
          `Merger ${node.id} has ${node.parents.length} inputs (max 3)`,
        ).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('belt-capped chain', () => {
    test('1x375 → 6x60: belt-capped chain produces compact linear network', () => {
      const request = makeRequest(
        [{ rate: 375, count: 1 }],
        [{ rate: 60, count: 6 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertBeltsWithinSpeed(result, 1200);
      assertTargetsReceiveCorrectRates(result, Array(6).fill(60));

      const splitters = result.nodes.filter(n => n.type === 'splitter');
      expect(splitters.length).toBeLessThanOrEqual(6);

      const leftoverTargets = result.nodes.filter(
        n => n.type === 'target' && n.label?.startsWith('Leftover'),
      );
      expect(leftoverTargets.length).toBe(1);
      expect(
        Math.abs(leftoverTargets[0].parents[0].carrying - 15),
      ).toBeLessThan(0.01);
    });

    test('1x780 → 2x120 + 1x60 + 1x480: mixed belt-speed targets', () => {
      const request = makeRequest(
        [{ rate: 780, count: 1 }],
        [
          { rate: 120, count: 2 },
          { rate: 60, count: 1 },
          { rate: 480, count: 1 },
        ],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertBeltsWithinSpeed(result, 1200);
      assertTargetsReceiveCorrectRates(result, [120, 120, 60, 480]);

      const splitters = result.nodes.filter(n => n.type === 'splitter');
      expect(splitters.length).toBeLessThanOrEqual(4);
    });

    test('non-belt-speed targets do NOT use chain (1x375 → 6x100 falls through)', () => {
      const request = makeRequest(
        [{ rate: 375, count: 1 }],
        [{ rate: 100, count: 3 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertTargetsReceiveCorrectRates(result, Array(3).fill(100));

      // Should NOT produce a chain — 100 is not a belt speed.
      // The result will use the normal algorithm (flow assignment / unit-rate).
      const splitters = result.nodes.filter(n => n.type === 'splitter');
      for (const s of splitters) {
        if (s.children.length <= 1) continue;
        const rates = s.children.map(l => l.carrying);
        // Non-chain splitters should have equal outputs
        const allEqual = rates.every(r => Math.abs(r - rates[0]) < 0.01);
        expect(
          allEqual,
          `Non-chain splitter ${s.id} should have equal outputs: ${rates.join(', ')}`,
        ).toBe(true);
      }
    });

    test('2x270 → 4x120: multiple sources merged then chained', () => {
      const request = makeRequest(
        [{ rate: 270, count: 2 }],
        [{ rate: 120, count: 4 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertBeltsWithinSpeed(result, 1200);
      assertTargetsReceiveCorrectRates(result, Array(4).fill(120));

      const mergers = result.nodes.filter(n => n.type === 'merger');
      expect(mergers.length).toBeGreaterThanOrEqual(1);
    });

    test('chain not used when total source exceeds max belt speed', () => {
      const request = makeRequest(
        [{ rate: 780, count: 2 }],
        [{ rate: 120, count: 12 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertBeltsWithinSpeed(result, 1200);
      assertTargetsReceiveCorrectRates(result, Array(12).fill(120));
    });

    test('1x1200 → 4x270: exact belt speeds, leftover 120', () => {
      const request = makeRequest(
        [{ rate: 1200, count: 1 }],
        [{ rate: 270, count: 4 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertBeltsWithinSpeed(result, 1200);
      assertTargetsReceiveCorrectRates(result, Array(4).fill(270));

      const leftoverTargets = result.nodes.filter(
        n => n.type === 'target' && n.label?.startsWith('Leftover'),
      );
      expect(leftoverTargets.length).toBe(1);
      expect(
        Math.abs(leftoverTargets[0].parents[0].carrying - 120),
      ).toBeLessThan(0.01);
    });

    test('1x300 → 1x240: leftover 60 is belt speed, single splitter with belt caps', () => {
      const request = makeRequest(
        [{ rate: 300, count: 1 }],
        [{ rate: 240, count: 1 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertBeltsWithinSpeed(result, 1200);
      assertTargetsReceiveCorrectRates(result, [240]);

      const leftoverTargets = result.nodes.filter(
        n => n.type === 'target' && n.label?.startsWith('Leftover'),
      );
      expect(leftoverTargets.length).toBe(1);
      expect(
        Math.abs(leftoverTargets[0].parents[0].carrying - 60),
      ).toBeLessThan(0.01);

      // Simple: source → splitter → target + leftover (no loopbacks)
      const splitters = result.nodes.filter(n => n.type === 'splitter');
      expect(splitters.length).toBeLessThanOrEqual(1);
      const mergers = result.nodes.filter(n => n.type === 'merger');
      expect(mergers.length).toBe(0);
    });
  });

  describe('independent sub-problem decomposition', () => {
    test('1x1200 + 1x600 → 10x120 + 10x60: each source solves independently, no loopbacks', () => {
      const request = makeRequest(
        [
          { rate: 1200, count: 1 },
          { rate: 600, count: 1 },
        ],
        [
          { rate: 120, count: 10 },
          { rate: 60, count: 10 },
        ],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertBeltsWithinSpeed(result, 1200);
      assertTargetsReceiveCorrectRates(result, [
        ...Array(10).fill(120),
        ...Array(10).fill(60),
      ]);

      // Should have no loopback edges (no edge going "backwards")
      const nodeIds = new Set(result.nodes.map(n => n.id));
      const mergerInputs = new Map<string, Set<string>>();
      for (const link of result.links) {
        if (link.to.type === 'merger') {
          if (!mergerInputs.has(link.to.id)) {
            mergerInputs.set(link.to.id, new Set());
          }
          mergerInputs.get(link.to.id)!.add(link.from.id);
        }
      }
      // In a loopback, a splitter output feeds back into a merger
      // that then feeds the same splitter. Check no such cycle exists.
      for (const [mergerId, fromIds] of mergerInputs) {
        const merger = result.nodes.find(n => n.id === mergerId);
        if (!merger) continue;
        for (const child of merger.children) {
          // If a merger's child is a splitter that also feeds back into this merger
          const childNode = child.to;
          if (childNode.type === 'splitter') {
            for (const grandchild of childNode.children) {
              expect(
                fromIds.has(grandchild.to.id),
                `Loopback detected: ${childNode.id} → ${grandchild.to.id} → ${mergerId}`,
              ).toBe(false);
            }
          }
        }
      }
    });

    test('sub-problems produce unique node IDs and sequential target labels', () => {
      const request = makeRequest(
        [
          { rate: 1200, count: 1 },
          { rate: 600, count: 1 },
        ],
        [
          { rate: 120, count: 10 },
          { rate: 60, count: 10 },
        ],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);

      // All node IDs must be unique
      const ids = result.nodes.map(n => n.id);
      const uniqueIds = new Set(ids);
      expect(
        uniqueIds.size,
        `Duplicate node IDs found: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(', ')}`,
      ).toBe(ids.length);

      // Target labels should be numbered sequentially 1-20
      const targetLabels = result.nodes
        .filter(n => n.type === 'target' && !n.label?.startsWith('Leftover'))
        .map(n => n.label!);
      expect(targetLabels.length).toBe(20);
      for (let i = 0; i < 20; i++) {
        expect(
          targetLabels.some(l => l.startsWith(`Target ${i + 1}:`)),
          `Missing Target ${i + 1} label`,
        ).toBe(true);
      }

      // Source labels should be "Source 1" and "Source 2"
      const sourceLabels = result.nodes
        .filter(n => n.type === 'source')
        .map(n => n.label!);
      expect(sourceLabels).toContain('Source 1');
      expect(sourceLabels).toContain('Source 2');
    });

    test('3x400 → 6x200: sources pair with target groups', () => {
      const request = makeRequest(
        [{ rate: 400, count: 3 }],
        [{ rate: 200, count: 6 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertTargetsReceiveCorrectRates(result, Array(6).fill(200));
    });
  });

  describe('edge cases', () => {
    test('1x1200 → 1x1200: direct connection, no splitter needed', () => {
      const request = makeRequest(
        [{ rate: 1200, count: 1 }],
        [{ rate: 1200, count: 1 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertTargetsReceiveCorrectRates(result, [1200]);

      const splitters = result.nodes.filter(n => n.type === 'splitter');
      expect(splitters.length).toBe(0);
    });

    test('single source to single target at exact rate', () => {
      const request = makeRequest(
        [{ rate: 480, count: 1 }],
        [{ rate: 480, count: 1 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertTargetsReceiveCorrectRates(result, [480]);
    });

    test('many targets: 1x1200 → 12x100', () => {
      const request = makeRequest(
        [{ rate: 1200, count: 1 }],
        [{ rate: 100, count: 12 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertSplittersHaveEqualOutputs(result);
      assertBeltsWithinSpeed(result, 1200);
      assertTargetsReceiveCorrectRates(result, Array(12).fill(100));
    });

    test('many sources merge: 6x200 → 1x1200', () => {
      const request = makeRequest(
        [{ rate: 200, count: 6 }],
        [{ rate: 1200, count: 1 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertBeltsWithinSpeed(result, 1200);
      assertTargetsReceiveCorrectRates(result, [1200]);
    });

    test('very small rates: 1x6 → 3x2', () => {
      const request = makeRequest(
        [{ rate: 6, count: 1 }],
        [{ rate: 2, count: 3 }],
      );
      const result = calculateSplitterNetwork(request);
      runStandardAssertions(result, Array(3).fill(2), 1200);
    });

    test('fractional rates: 1x100 → 3x33.33', () => {
      const rate = 100 / 3;
      const request = makeRequest(
        [{ rate: 100, count: 1 }],
        [{ rate: rate, count: 3 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertSplittersHaveEqualOutputs(result);
      assertBeltsWithinSpeed(result, 1200);
    });

    test('same rate multiple sources and targets: 4x300 → 4x300', () => {
      const request = makeRequest(
        [{ rate: 300, count: 4 }],
        [{ rate: 300, count: 4 }],
      );
      const result = calculateSplitterNetwork(request);
      assertNoError(result);
      assertTargetsReceiveCorrectRates(result, Array(4).fill(300));
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

    test('slightly insufficient sources still error', () => {
      const request = makeRequest(
        [{ rate: 999, count: 1 }],
        [{ rate: 1000, count: 1 }],
      );
      const result = calculateSplitterNetwork(request);
      expect(result.error).toBeDefined();
    });
  });
});
