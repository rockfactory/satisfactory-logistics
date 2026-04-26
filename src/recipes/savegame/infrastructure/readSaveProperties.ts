import type { Vec3 } from './types';

/**
 * One point of an Unreal `mSplineData` array: the location plus
 * `ArriveTangent` / `LeaveTangent` (Hermite tangents in the entity's
 * local frame). The renderer turns the tangents into Bezier control
 * points so curved track / belt sections actually look curved instead
 * of being approximated by straight chords between control points.
 * Tangents default to zero on entries that don't expose them, which
 * makes the resulting Bezier collapse to a straight `lineTo`.
 */
export interface SplinePoint {
  x: number;
  y: number;
  z: number;
  arriveX: number;
  arriveY: number;
  leaveX: number;
  leaveY: number;
}

/**
 * Reads `properties.mSplineData` (an `ArrayProperty<StructProperty>` of
 * `SplinePointData`) into a flat list of points + tangents relative to
 * the entity's transform. The worker is expected to rotate/translate
 * them into world space afterwards. Returns null if the field is
 * absent or contains fewer than 2 valid points (a single-point
 * "polyline" can't be drawn).
 */
export function readSplineLocations(
  properties: Record<string, unknown> | undefined,
): SplinePoint[] | null {
  const sd = (
    properties as { mSplineData?: { values?: unknown[] } } | undefined
  )?.mSplineData;
  if (!sd || !Array.isArray(sd.values)) return null;
  const out: SplinePoint[] = [];
  for (const sp of sd.values) {
    const props = (
      sp as
        | {
            properties?: {
              Location?: { value?: Partial<Vec3> };
              ArriveTangent?: { value?: Partial<Vec3> };
              LeaveTangent?: { value?: Partial<Vec3> };
            };
          }
        | undefined
    )?.properties;
    const loc = props?.Location?.value;
    if (
      !loc ||
      typeof loc.x !== 'number' ||
      typeof loc.y !== 'number' ||
      !Number.isFinite(loc.x) ||
      !Number.isFinite(loc.y)
    ) {
      continue;
    }
    const arrive = props?.ArriveTangent?.value;
    const leave = props?.LeaveTangent?.value;
    out.push({
      x: loc.x,
      y: loc.y,
      z: typeof loc.z === 'number' ? loc.z : 0,
      arriveX:
        typeof arrive?.x === 'number' && Number.isFinite(arrive.x)
          ? arrive.x
          : 0,
      arriveY:
        typeof arrive?.y === 'number' && Number.isFinite(arrive.y)
          ? arrive.y
          : 0,
      leaveX:
        typeof leave?.x === 'number' && Number.isFinite(leave.x) ? leave.x : 0,
      leaveY:
        typeof leave?.y === 'number' && Number.isFinite(leave.y) ? leave.y : 0,
    });
  }
  return out.length >= 2 ? out : null;
}

/**
 * Reads `properties.mWireInstances[*].properties.Locations` into per-
 * wire arrays of absolute world positions. `Locations` are absolute
 * (unlike `mSplineData` which is relative); `CachedRelativeLocations`
 * is the relative variant and is intentionally ignored. Wires with
 * fewer than 2 valid points are dropped.
 */
export function readPowerLineWires(
  properties: Record<string, unknown> | undefined,
): Vec3[][] {
  const wires = (
    properties as { mWireInstances?: { values?: unknown[] } } | undefined
  )?.mWireInstances;
  if (!wires || !Array.isArray(wires.values)) return [];
  const out: Vec3[][] = [];
  for (const wire of wires.values) {
    const locs = (
      wire as { properties?: { Locations?: unknown[] } } | undefined
    )?.properties?.Locations;
    if (!Array.isArray(locs)) continue;
    const points: Vec3[] = [];
    for (const item of locs) {
      const v = (item as { value?: Partial<Vec3> } | undefined)?.value;
      if (
        !v ||
        typeof v.x !== 'number' ||
        typeof v.y !== 'number' ||
        !Number.isFinite(v.x) ||
        !Number.isFinite(v.y)
      ) {
        continue;
      }
      points.push({ x: v.x, y: v.y, z: typeof v.z === 'number' ? v.z : 0 });
    }
    if (points.length >= 2) out.push(points);
  }
  return out;
}
