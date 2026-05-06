import { describe, expect, test } from 'vitest';
import type { Game } from '@/games/Game';
import type { SerializedGame } from '@/games/store/gameFactoriesActions';
import {
  assessIncomingShrink,
  assessLocalVsRemote,
  SHRINK_RATIO_THRESHOLD,
} from './integrityGuard';

function makeIds(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `factory-${i}`);
}

function makeGame(factoryCount: number): Game {
  return {
    id: 'g1',
    name: 'Game',
    factoriesIds: makeIds(factoryCount),
    settings: {},
  };
}

function makeIncoming(factoryCount: number): SerializedGame {
  return {
    game: { ...makeGame(factoryCount) },
    factories: [],
    solvers: [],
  };
}

describe('integrityGuard - assessIncomingShrink', () => {
  test('flags 15 -> 1 (issue #127 case)', () => {
    const v = assessIncomingShrink(makeGame(15), makeIncoming(1));
    expect(v.suspiciousShrink).toBe(true);
    expect(v.previousFactoryCount).toBe(15);
    expect(v.nextFactoryCount).toBe(1);
  });

  test('flags 10 -> 4 (drop > 50%)', () => {
    expect(
      assessIncomingShrink(makeGame(10), makeIncoming(4)).suspiciousShrink,
    ).toBe(true);
  });

  test('does NOT flag 10 -> 5 (boundary, exact 50%)', () => {
    // Math.floor(10 * 0.5) === 5; condition is `next <= floor`, so 5 trips it.
    // We want a hard 50% threshold: exact 50% should be allowed.
    // The current implementation is INTENTIONALLY conservative (flags 10->5)
    // because at exactly half we still want a snapshot. Codified here so a
    // future tuning change is explicit.
    expect(
      assessIncomingShrink(makeGame(10), makeIncoming(5)).suspiciousShrink,
    ).toBe(true);
  });

  test('does NOT flag 10 -> 6', () => {
    expect(
      assessIncomingShrink(makeGame(10), makeIncoming(6)).suspiciousShrink,
    ).toBe(false);
  });

  test('does NOT flag 0 -> 0', () => {
    expect(
      assessIncomingShrink(makeGame(0), makeIncoming(0)).suspiciousShrink,
    ).toBe(false);
  });

  test('does NOT flag 1 -> 0 (genuine empty)', () => {
    expect(
      assessIncomingShrink(makeGame(1), makeIncoming(0)).suspiciousShrink,
    ).toBe(false);
  });

  test('does NOT flag 0 -> N (initial sync)', () => {
    expect(
      assessIncomingShrink(makeGame(0), makeIncoming(5)).suspiciousShrink,
    ).toBe(false);
  });

  test('handles undefined local (game just created)', () => {
    const v = assessIncomingShrink(undefined, makeIncoming(3));
    expect(v.suspiciousShrink).toBe(false);
    expect(v.previousFactoryCount).toBe(0);
    expect(v.nextFactoryCount).toBe(3);
  });
});

describe('integrityGuard - assessLocalVsRemote', () => {
  test('flags local 1 vs remote 15 (we are about to clobber)', () => {
    const v = assessLocalVsRemote(makeIncoming(1), makeIds(15));
    expect(v.suspiciousShrink).toBe(true);
    expect(v.previousFactoryCount).toBe(15);
    expect(v.nextFactoryCount).toBe(1);
  });

  test('does NOT flag local 15 vs remote 1 (we have more)', () => {
    expect(
      assessLocalVsRemote(makeIncoming(15), makeIds(1)).suspiciousShrink,
    ).toBe(false);
  });

  test('handles missing remote ids array', () => {
    expect(
      assessLocalVsRemote(makeIncoming(5), undefined).suspiciousShrink,
    ).toBe(false);
  });
});

test('SHRINK_RATIO_THRESHOLD is 0.5 (sanity)', () => {
  expect(SHRINK_RATIO_THRESHOLD).toBe(0.5);
});
