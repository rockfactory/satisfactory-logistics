import type { Vec3 } from './types';

/**
 * Reads `properties.mSplineData` (an `ArrayProperty<StructProperty>` of
 * `SplinePointData`) into a flat list of locations relative to the
 * entity's transform. Each entry's `Location.value.{x,y,z}` is the
 * point in local space — the worker is expected to rotate/translate
 * them into world space afterwards. Returns null if the field is
 * absent or contains fewer than 2 valid points (a single-point
 * "polyline" can't be drawn).
 */
export function readSplineLocations(
  properties: Record<string, unknown> | undefined,
): Vec3[] | null {
  const sd = (
    properties as { mSplineData?: { values?: unknown[] } } | undefined
  )?.mSplineData;
  if (!sd || !Array.isArray(sd.values)) return null;
  const out: Vec3[] = [];
  for (const sp of sd.values) {
    const loc = (
      sp as
        | {
            properties?: { Location?: { value?: Partial<Vec3> } };
          }
        | undefined
    )?.properties?.Location?.value;
    if (
      !loc ||
      typeof loc.x !== 'number' ||
      typeof loc.y !== 'number' ||
      !Number.isFinite(loc.x) ||
      !Number.isFinite(loc.y)
    ) {
      continue;
    }
    out.push({ x: loc.x, y: loc.y, z: typeof loc.z === 'number' ? loc.z : 0 });
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
