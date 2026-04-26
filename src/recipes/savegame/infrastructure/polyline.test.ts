import { describe, expect, it } from 'vitest';
import { buildAbsolutePolyline, buildRotatedPolyline } from './polyline';
import type { SplinePoint } from './readSaveProperties';

const EPSILON = 1e-6;

function expectClose(actual: number[], expected: number[]) {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(Math.abs(actual[i] - expected[i])).toBeLessThan(EPSILON);
  }
}

function point(
  x: number,
  y: number,
  partial: Partial<Omit<SplinePoint, 'x' | 'y'>> = {},
): SplinePoint {
  return {
    x,
    y,
    z: partial.z ?? 0,
    arriveX: partial.arriveX ?? 0,
    arriveY: partial.arriveY ?? 0,
    leaveX: partial.leaveX ?? 0,
    leaveY: partial.leaveY ?? 0,
  };
}

describe('buildRotatedPolyline', () => {
  it('translates points without rotation when yaw is 0', () => {
    const result = buildRotatedPolyline(100, 200, 0, [
      point(0, 0),
      point(50, 0),
      point(50, 30),
    ]);
    expectClose(result.flat, [100, 200, 150, 200, 150, 230]);
  });

  it('rotates a +X-aligned segment 90° CCW into a +Y segment', () => {
    const result = buildRotatedPolyline(0, 0, Math.PI / 2, [
      point(0, 0),
      point(100, 0),
    ]);
    expectClose(result.flat, [0, 0, 0, 100]);
  });

  it('rotates around the translation, not the local origin', () => {
    const result = buildRotatedPolyline(1000, 500, Math.PI, [
      point(0, 0),
      point(100, 0),
    ]);
    expectClose(result.flat, [1000, 500, 900, 500]);
  });

  it('rotates the Hermite tangents but does not translate them', () => {
    // 90° CCW: a +X tangent becomes a +Y tangent. Translation is
    // applied to locations, never to tangent vectors.
    const result = buildRotatedPolyline(1000, 500, Math.PI / 2, [
      point(0, 0, { leaveX: 100, leaveY: 0 }),
      point(50, 0, { arriveX: 100, arriveY: 0 }),
    ]);
    expect(result.tangents).not.toBeNull();
    // Layout: [aX0, aY0, lX0, lY0, aX1, aY1, lX1, lY1].
    expectClose(result.tangents as number[], [0, 0, 0, 100, 0, 100, 0, 0]);
  });
});

describe('buildAbsolutePolyline', () => {
  it('flattens points to interleaved xy with no transform', () => {
    const result = buildAbsolutePolyline([
      { x: -73987.74, y: 229807.58, z: -1583 },
      { x: -72172.83, y: 229337.62, z: -1893 },
    ]);
    expect(result.flat).toEqual([-73987.74, 229807.58, -72172.83, 229337.62]);
    expect(result.tangents).toBeNull();
  });

  it('returns an empty array on an empty input', () => {
    const result = buildAbsolutePolyline([]);
    expect(result.flat).toEqual([]);
    expect(result.tangents).toBeNull();
  });
});
