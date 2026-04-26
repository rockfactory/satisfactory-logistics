/**
 * Yaw (rotation around the world's vertical Z axis) extracted from a
 * Unreal quaternion stored as `{x, y, z, w}`. Used to orient building
 * footprints on the top-down map; pitch and roll are irrelevant for
 * 2D rendering.
 *
 * The result is in radians in the world frame. Callers rendering on
 * Leaflet's CRS.Simple (Y axis mirrored — see `gameToLatLng` in
 * `src/map/coords.ts`) must negate this value when applying it as a
 * canvas rotation.
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
