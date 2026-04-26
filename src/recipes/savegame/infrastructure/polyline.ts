import type { Vec3 } from './types';

/**
 * Builds a flat (xy interleaved) polyline by rotating each local-frame
 * point by `yaw` (radians, around vertical Z) and translating by
 * `(tx, ty)`. Used for spline data extracted in the entity's local
 * frame (mSplineData on belts/pipes/rails).
 */
export function buildRotatedPolyline(
  tx: number,
  ty: number,
  yaw: number,
  points: Vec3[],
): number[] {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const flat = new Array<number>(points.length * 2);
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    flat[i * 2] = tx + p.x * cy - p.y * sy;
    flat[i * 2 + 1] = ty + p.x * sy + p.y * cy;
  }
  return flat;
}

/**
 * Builds a flat (xy interleaved) polyline directly from absolute world
 * positions. Used for power-line wire instances whose `Locations` are
 * already in world space.
 */
export function buildAbsolutePolyline(points: Vec3[]): number[] {
  const flat = new Array<number>(points.length * 2);
  for (let i = 0; i < points.length; i++) {
    flat[i * 2] = points[i].x;
    flat[i * 2 + 1] = points[i].y;
  }
  return flat;
}
