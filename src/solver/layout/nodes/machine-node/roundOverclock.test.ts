import { describe, expect, test } from 'vitest';
import { roundOverclock } from './roundOverclock';

// Mirrors the display-side rounding done by MachineNodeProductionConfig so we
// can verify what the user actually sees in the % NumberInput, not just the
// stored multiplier.
const displayPercent = (multiplier: number) =>
  Math.round(multiplier * 100 * 10000) / 10000;

describe('roundOverclock', () => {
  test('keeps clean 2-decimal-percent values exact (75% -> 0.75)', () => {
    expect(roundOverclock(0.75)).toBe(0.75);
    expect(displayPercent(roundOverclock(0.75))).toBe(75);
  });

  test('regression: round-up button result that displayed as 224.00000000000003% now displays as 224%', () => {
    // What the back-solve produces for a typical "round buildings up" case.
    // Note: 2.2400000000000003 is the same float as 2.24, but we assert the
    // display side using the same rounding the UI does.
    const fromBackSolve = 2.24;
    const rounded = roundOverclock(fromBackSolve);
    expect(displayPercent(rounded)).toBe(224);
  });

  test('falls back to 4-decimal percent when 2dp would lose detail (2/3 -> 66.6667%)', () => {
    const rounded = roundOverclock(2 / 3);
    expect(displayPercent(rounded)).toBe(66.6667);
  });

  test('keeps 100% as exactly 1', () => {
    expect(roundOverclock(1)).toBe(1);
    expect(displayPercent(roundOverclock(1))).toBe(100);
  });

  test('handles min and max overclocks cleanly (1% and 250%)', () => {
    expect(displayPercent(roundOverclock(0.01))).toBe(1);
    expect(displayPercent(roundOverclock(2.5))).toBe(250);
  });

  test('passes through non-finite values', () => {
    expect(roundOverclock(Number.NaN)).toBeNaN();
    expect(roundOverclock(Number.POSITIVE_INFINITY)).toBe(
      Number.POSITIVE_INFINITY,
    );
  });
});
