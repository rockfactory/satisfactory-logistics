import { describe, expect, it } from 'vitest';
import { readPowerLineWires, readSplineLocations } from './readSaveProperties';

function makeSplinePoint(
  x: number,
  y: number,
  z = 0,
  tangents: {
    arriveX?: number;
    arriveY?: number;
    leaveX?: number;
    leaveY?: number;
  } = {},
) {
  return {
    properties: {
      Location: { value: { x, y, z } },
      ArriveTangent: {
        value: { x: tangents.arriveX ?? 0, y: tangents.arriveY ?? 0, z: 0 },
      },
      LeaveTangent: {
        value: { x: tangents.leaveX ?? 0, y: tangents.leaveY ?? 0, z: 0 },
      },
    },
  };
}

function makeWireValue(x: number, y: number, z = 0) {
  return { value: { x, y, z } };
}

const ZERO_TANGENTS = {
  arriveX: 0,
  arriveY: 0,
  leaveX: 0,
  leaveY: 0,
};

describe('readSplineLocations', () => {
  it('returns null when mSplineData is missing', () => {
    expect(readSplineLocations(undefined)).toBeNull();
    expect(readSplineLocations({})).toBeNull();
    expect(readSplineLocations({ mSplineData: { values: [] } })).toBeNull();
  });

  it('returns null when fewer than 2 valid points are present', () => {
    expect(
      readSplineLocations({
        mSplineData: { values: [makeSplinePoint(0, 0)] },
      }),
    ).toBeNull();
  });

  it('parses the Location.value of each spline point in order', () => {
    const result = readSplineLocations({
      mSplineData: {
        values: [makeSplinePoint(0, 0), makeSplinePoint(100, 200, 5)],
      },
    });
    expect(result).toEqual([
      { x: 0, y: 0, z: 0, ...ZERO_TANGENTS },
      { x: 100, y: 200, z: 5, ...ZERO_TANGENTS },
    ]);
  });

  it('parses ArriveTangent and LeaveTangent when present', () => {
    const result = readSplineLocations({
      mSplineData: {
        values: [
          makeSplinePoint(0, 0, 0, { leaveX: 100, leaveY: 50 }),
          makeSplinePoint(200, 0, 0, { arriveX: 100, arriveY: -50 }),
        ],
      },
    });
    expect(result).toEqual([
      { x: 0, y: 0, z: 0, arriveX: 0, arriveY: 0, leaveX: 100, leaveY: 50 },
      {
        x: 200,
        y: 0,
        z: 0,
        arriveX: 100,
        arriveY: -50,
        leaveX: 0,
        leaveY: 0,
      },
    ]);
  });

  it('drops malformed entries while keeping the rest', () => {
    const result = readSplineLocations({
      mSplineData: {
        values: [
          makeSplinePoint(0, 0),
          // Non-numeric and Infinity entries should be skipped.
          { properties: { Location: { value: { x: 'oops', y: 1 } } } },
          {
            properties: {
              Location: { value: { x: 1, y: Number.POSITIVE_INFINITY } },
            },
          },
          makeSplinePoint(50, 50),
        ],
      },
    });
    expect(result).toEqual([
      { x: 0, y: 0, z: 0, ...ZERO_TANGENTS },
      { x: 50, y: 50, z: 0, ...ZERO_TANGENTS },
    ]);
  });
});

describe('readPowerLineWires', () => {
  it('returns an empty list when mWireInstances is absent', () => {
    expect(readPowerLineWires(undefined)).toEqual([]);
    expect(readPowerLineWires({})).toEqual([]);
  });

  it('returns one polyline per wire instance with valid endpoints', () => {
    const result = readPowerLineWires({
      mWireInstances: {
        values: [
          {
            properties: {
              Locations: [
                makeWireValue(-73987, 229807, -1583),
                makeWireValue(-72172, 229337, -1893),
              ],
            },
          },
        ],
      },
    });
    expect(result).toEqual([
      [
        { x: -73987, y: 229807, z: -1583 },
        { x: -72172, y: 229337, z: -1893 },
      ],
    ]);
  });

  it('skips wires with fewer than 2 valid points', () => {
    const result = readPowerLineWires({
      mWireInstances: {
        values: [
          { properties: { Locations: [makeWireValue(0, 0)] } },
          {
            properties: {
              Locations: [makeWireValue(1, 2), makeWireValue(3, 4)],
            },
          },
        ],
      },
    });
    expect(result).toEqual([
      [
        { x: 1, y: 2, z: 0 },
        { x: 3, y: 4, z: 0 },
      ],
    ]);
  });
});
