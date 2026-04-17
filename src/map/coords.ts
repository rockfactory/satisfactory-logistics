import L from 'leaflet';

/**
 * Converts game world coordinates (cm, Unreal default unit) to image
 * pixel coordinates suitable for Leaflet's `CRS.Simple`.
 *
 * Constants are tuned to the map at `public/images/map/world-map.jpg`,
 * which is the official top-down render of MASSAGE-2 (AB)b sourced from
 * the Satisfactory Wiki (2048x2048). When the image is replaced with a
 * different render only the constants below need to change.
 *
 * The bounds and the Y-flip below match the calibration used by
 * `Hirashi3630/satisfactory_node_heatmap` (MIT, see this project's map
 * README). The playable area is treated as a 750,000 cm square; the
 * image's top edge is `+Y` (north on the in-game compass) and the
 * bottom edge is `-Y`, hence the flip in `gameToLatLng`.
 */

/** Width and height of the map image in pixels (square). */
export const IMAGE_SIZE = 2048;

/** Game-space bounds of the playable area, in centimeters. */
export const WORLD_X_MIN = -324_700;
export const WORLD_X_MAX = 425_300;
export const WORLD_Y_MIN = -375_000;
export const WORLD_Y_MAX = 375_000;

/**
 * Bounds for the `ImageOverlay`. Leaflet `CRS.Simple` uses
 * `[y, x]` (lat, lng) ordering, with the y-axis pointing down.
 */
export const IMAGE_BOUNDS: L.LatLngBoundsExpression = [
  [0, 0],
  [IMAGE_SIZE, IMAGE_SIZE],
];

const X_RANGE = WORLD_X_MAX - WORLD_X_MIN;
const Y_RANGE = WORLD_Y_MAX - WORLD_Y_MIN;

/**
 * Converts a `(gameX, gameY)` point in centimeters to a Leaflet
 * `LatLng` for `CRS.Simple`. Game `+x` is mapped right and game `+y`
 * is mapped up (so the bottom edge of the image is `Y_MIN`, matching
 * the in-game compass where `+Y` points north).
 */
export function gameToLatLng(gameX: number, gameY: number): L.LatLng {
  const px = ((gameX - WORLD_X_MIN) / X_RANGE) * IMAGE_SIZE;
  const py = IMAGE_SIZE - ((gameY - WORLD_Y_MIN) / Y_RANGE) * IMAGE_SIZE;
  return L.latLng(py, px);
}

/** Convenient default center (geometric center of the playable area). */
export const DEFAULT_CENTER: L.LatLngExpression = [
  IMAGE_SIZE / 2,
  IMAGE_SIZE / 2,
];

/** Sensible initial zoom showing the whole map. */
export const DEFAULT_ZOOM = -1;

/** Min/max zoom kept conservative to keep markers usable at all scales. */
export const MIN_ZOOM = -2;
export const MAX_ZOOM = 3;
