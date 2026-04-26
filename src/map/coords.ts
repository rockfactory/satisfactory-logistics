import L from 'leaflet';

/**
 * Projects game world coordinates (cm, Unreal default unit) into
 * Leaflet `CRS.Simple` LatLng space. Backdrop is a WebP tile pyramid
 * (levels 0-6) on DigitalOcean Spaces; see the map README for details
 * on calibration, tile generation, and the coord mapping.
 */

/** Logical coord-space size. Equals the tile size so zoom 0 == 1 tile. */
export const IMAGE_SIZE = 256;

/** Game-space bounds of the playable area, in centimeters. */
export const WORLD_X_MIN = -324_700;
export const WORLD_X_MAX = 425_300;
export const WORLD_Y_MIN = -375_000;
export const WORLD_Y_MAX = 375_000;

/**
 * Bounds for the world map image in Leaflet `CRS.Simple` coordinates.
 *
 * `CRS.Simple` has y increasing upward (northing convention, see
 * https://leafletjs.com/examples/crs-simple/crs-simple.html), so the
 * top edge of the image sits at `lat = 0` and the bottom edge at
 * `lat = -IMAGE_SIZE`. This orientation is required for XYZ tile
 * layers: pixel-y = -lat is then non-negative over the image, and
 * tile indices (pixel-y / tileSize) stay in [0, imageHeight/tileSize),
 * matching the `gdal2tiles.py --xyz` pyramid on disk.
 */
export const IMAGE_BOUNDS: L.LatLngBoundsExpression = [
  [-IMAGE_SIZE, 0],
  [0, IMAGE_SIZE],
];

const X_RANGE = WORLD_X_MAX - WORLD_X_MIN;
const Y_RANGE = WORLD_Y_MAX - WORLD_Y_MIN;

/**
 * Converts a `(gameX, gameY)` point in centimeters to a Leaflet
 * `LatLng` for `CRS.Simple`. Game `+x` maps right. The current tile
 * pyramid is rendered with game `+y` (north on the in-game compass) at
 * the *bottom* of the image, so `+Y` maps to `lat = -IMAGE_SIZE` and
 * `-Y` maps to `lat = 0`.
 */
export function gameToLatLng(gameX: number, gameY: number): L.LatLng {
  const px = ((gameX - WORLD_X_MIN) / X_RANGE) * IMAGE_SIZE;
  const py = -((gameY - WORLD_Y_MIN) / Y_RANGE) * IMAGE_SIZE;
  return L.latLng(py, px);
}

/**
 * Inverse of {@link gameToLatLng}: turns a Leaflet `LatLng` (CRS.Simple)
 * back into a `(gameX, gameY)` pair in cm. Used by the infrastructure
 * tile layer to map a tile's pixel corners to a worldspace bbox so the
 * spatial index can be queried for entities that fall inside.
 */
export function latLngToGame(latLng: L.LatLng): { x: number; y: number } {
  const x = (latLng.lng / IMAGE_SIZE) * X_RANGE + WORLD_X_MIN;
  const y = (-latLng.lat / IMAGE_SIZE) * Y_RANGE + WORLD_Y_MIN;
  return { x, y };
}

/** Convenient default center (geometric center of the playable area). */
export const DEFAULT_CENTER: L.LatLngExpression = [
  -IMAGE_SIZE / 2,
  IMAGE_SIZE / 2,
];

/**
 * Leaflet zoom range. Matches the tile pyramid 1:1 (no offset): 0 shows
 * the whole map in one 256x256 tile, 7 is the native 32768x32768
 * resolution of the source PNG. `DEFAULT_ZOOM` shows the map at about
 * 1024 px (readable on typical viewports).
 */
export const MIN_ZOOM = 0;
export const MAX_ZOOM = 7;
export const DEFAULT_ZOOM = 2;
