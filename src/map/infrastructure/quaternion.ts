/**
 * Yaw (rotation around the world's vertical Z axis) extracted from a
 * Unreal quaternion stored as `{x, y, z, w}`. Used to orient building
 * footprints on the top-down map; pitch and roll are irrelevant for
 * 2D rendering.
 *
 * The result is in radians in the world frame. `gameToLatLng` in
 * `src/map/coords.ts` maps game (X, Y) → canvas (X, Y) preserving
 * direction on both axes (game +Y and canvas +Y both increase
 * downward), so the world-frame yaw is also the canvas-frame angle:
 * apply it directly without negation.
 */
export function quaternionToYaw(q: {
  x: number;
  y: number;
  z: number;
  w: number;
}): number {
  const { x, y, z, w } = q;
  return Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
}
