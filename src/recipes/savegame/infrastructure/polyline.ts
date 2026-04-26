import type { SplinePoint } from './readSaveProperties';
import type { Vec3 } from './types';

export interface BuiltPolyline {
  /** Flat xy-interleaved canvas-frame point coordinates, length = N*2. */
  flat: number[];
  /**
   * Flat tangent buffer in canvas frame, length = N*4. Layout per
   * point: `[arriveX, arriveY, leaveX, leaveY]`. `null` when the
   * source has no Hermite tangents (e.g. power-line wires), in which
   * case the consumer should fall back to `lineTo` segments.
   */
  tangents: number[] | null;
}

/**
 * Builds a flat (xy interleaved) polyline by rotating each local-frame
 * point by `yaw` (radians, around vertical Z) and translating by
 * `(tx, ty)`. The Hermite tangents are rotated too (they're vectors,
 * so the translation does not apply). Used for spline data extracted
 * in the entity's local frame (mSplineData on belts/pipes/rails).
 */
export function buildRotatedPolyline(
  tx: number,
  ty: number,
  yaw: number,
  points: SplinePoint[],
): BuiltPolyline {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const flat = new Array<number>(points.length * 2);
  const tangents = new Array<number>(points.length * 4);
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    flat[i * 2] = tx + p.x * cy - p.y * sy;
    flat[i * 2 + 1] = ty + p.x * sy + p.y * cy;
    tangents[i * 4] = p.arriveX * cy - p.arriveY * sy;
    tangents[i * 4 + 1] = p.arriveX * sy + p.arriveY * cy;
    tangents[i * 4 + 2] = p.leaveX * cy - p.leaveY * sy;
    tangents[i * 4 + 3] = p.leaveX * sy + p.leaveY * cy;
  }
  return { flat, tangents };
}

/**
 * Builds a flat (xy interleaved) polyline directly from absolute world
 * positions. Used for power-line wire instances whose `Locations` are
 * already in world space and which have no Hermite tangents (the wire
 * sag is rendered as a series of straight chords).
 */
export function buildAbsolutePolyline(points: Vec3[]): BuiltPolyline {
  const flat = new Array<number>(points.length * 2);
  for (let i = 0; i < points.length; i++) {
    flat[i * 2] = points[i].x;
    flat[i * 2 + 1] = points[i].y;
  }
  return { flat, tangents: null };
}
