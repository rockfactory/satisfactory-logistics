import { describe, expect, it } from 'vitest';
import { buildAbsolutePolyline, buildRotatedPolyline } from './polyline';

const EPSILON = 1e-6;

function expectClose(actual: number[], expected: number[]) {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(Math.abs(actual[i] - expected[i])).toBeLessThan(EPSILON);
  }
}

describe('buildRotatedPolyline', () => {
  it('translates points without rotation when yaw is 0', () => {
    const result = buildRotatedPolyline(100, 200, 0, [
      { x: 0, y: 0, z: 0 },
      { x: 50, y: 0, z: 0 },
      { x: 50, y: 30, z: 0 },
    ]);
    expectClose(result, [100, 200, 150, 200, 150, 230]);
  });

  it('rotates a +X-aligned segment 90° CCW into a +Y segment', () => {
    const result = buildRotatedPolyline(0, 0, Math.PI / 2, [
      { x: 0, y: 0, z: 0 },
      { x: 100, y: 0, z: 0 },
    ]);
    expectClose(result, [0, 0, 0, 100]);
  });

  it('rotates around the translation, not the local origin', () => {
    const result = buildRotatedPolyline(1000, 500, Math.PI, [
      { x: 0, y: 0, z: 0 },
      { x: 100, y: 0, z: 0 },
    ]);
    expectClose(result, [1000, 500, 900, 500]);
  });
});

describe('buildAbsolutePolyline', () => {
  it('flattens points to interleaved xy with no transform', () => {
    expect(
      buildAbsolutePolyline([
        { x: -73987.74, y: 229807.58, z: -1583 },
        { x: -72172.83, y: 229337.62, z: -1893 },
      ]),
    ).toEqual([-73987.74, 229807.58, -72172.83, 229337.62]);
  });

  it('returns an empty array on an empty input', () => {
    expect(buildAbsolutePolyline([])).toEqual([]);
  });
});
