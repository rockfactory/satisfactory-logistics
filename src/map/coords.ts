import L from 'leaflet';

/**
 * Converts game world coordinates (cm, Unreal default unit) to image
 * pixel coordinates suitable for Leaflet's `CRS.Simple`.
 *
 * `IMAGE_SIZE` is the logical coordinate space the world is projected
 * onto; it is decoupled from the backdrop's actual pixel resolution.
 * The backdrop is a WebP tile pyramid (zoom 0-6, 7 levels) derived from
 * a 16384x16384 source, served from DigitalOcean Spaces. See the map
 * README for the tile generation/upload flow.
 *
 * The bounds and the Y-flip below match the calibration used by
 * `Hirashi3630/satisfactory_node_heatmap` (MIT, see this project's map
 * README). The playable area is treated as a 750,000 cm square; the
 * image's top edge is `+Y` (north on the in-game compass) and the
 * bottom edge is `-Y`, hence the flip in `gameToLatLng`.
 */

/** Size of the logical coordinate space the world is projected onto. */
export const IMAGE_SIZE = 2048;

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
 * `LatLng` for `CRS.Simple`. Game `+x` maps right and game `+y` (north,
 * in-game compass) maps to `lat = 0` (top of the image); `-Y` maps to
 * `lat = -IMAGE_SIZE` (bottom).
 */
export function gameToLatLng(gameX: number, gameY: number): L.LatLng {
  const px = ((gameX - WORLD_X_MIN) / X_RANGE) * IMAGE_SIZE;
  const py = ((gameY - WORLD_Y_MIN) / Y_RANGE) * IMAGE_SIZE - IMAGE_SIZE;
  return L.latLng(py, px);
}

/** Convenient default center (geometric center of the playable area). */
export const DEFAULT_CENTER: L.LatLngExpression = [
  -IMAGE_SIZE / 2,
  IMAGE_SIZE / 2,
];

/** Sensible initial zoom showing the whole map. */
export const DEFAULT_ZOOM = -1;

/** Min/max zoom kept conservative to keep markers usable at all scales. */
export const MIN_ZOOM = -3;
export const MAX_ZOOM = 3;

/**
 * Leaflet zoom to tile-pyramid zoom offset. The pyramid has 7 levels
 * (0..6); Leaflet zoom 0 corresponds to tile zoom 3 (because the source
 * pixels, 16384, are 8x the logical coord space, 2048), so
 * `tileZoom = leafletZoom + TILE_ZOOM_OFFSET` keeps the Leaflet-native
 * zoom range centered on a readable view.
 */
export const TILE_ZOOM_OFFSET = 3;
