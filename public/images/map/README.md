# World map asset

The `Map` page (`src/map/`) renders a Satisfactory world map. Starting
from this revision the backdrop is no longer a single static image, but a
**WebP tile pyramid** served from a CDN. `public/images/map/` keeps only
static fallbacks and documentation; the tile pyramid itself lives on
DigitalOcean Spaces (see [below](#tile-pyramid--cdn)).

## Map image: source and license

The tile pyramid is derived from an in-game extraction of the
MASSAGE-2 (AB)b world map (8192x8192 PNG), upscaled 4x with AI to
32768x32768. The map artwork is the intellectual property of Coffee Stain
Studios and is reproduced here for reference under fair use, consistent
with how community Satisfactory tools (e.g.
[satisfactory-calculator.com](https://satisfactory-calculator.com)) use
the same asset.

The wiki text content is published under
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/);
the map render itself is a Coffee Stain Studios asset.

## Resource node data: source and license

The bundled resource-node coordinates in
[`src/recipes/WorldResourceNodes.json`](../../../src/recipes/WorldResourceNodes.json)
are derived from
[`Hirashi3630/satisfactory_node_heatmap`](https://github.com/Hirashi3630/satisfactory_node_heatmap)
(`resources/nodes_vanilla.json`), which extracts vanilla 1.0 node data
via the Ficsit Networking mod. That project is MIT-licensed; we
preserve its underlying values and only reformat the records into our
schema (`{ id, resource, purity, x, y, z }`).

## Coordinate calibration

The whole pipeline (game coords → Leaflet LatLng → screen pixels →
tile indices) is driven by a small number of constants in
[`src/map/coords.ts`](../../../src/map/coords.ts). The ASCII diagram
below summarises how the three spaces line up.

```
Game world (cm)              Leaflet CRS.Simple             Pixel / tile space
(Unreal axes)                (LatLng, y-up)                 (Leaflet zoom 0)

  +Y = north (top)             lat =  0         top         pixel_y =   0   tile y = 0
   │                            │                            │
   ├──                         ─┤                           ─┤
   │                            │                            │
  -Y = south (bottom)           lat = -256       bottom      pixel_y = 256  tile y = 0

  -X = west (left)              lng =    0       left        pixel_x =   0  tile x = 0
  +X = east (right)             lng =  256       right       pixel_x = 256  tile x = 0
```

At Leaflet zoom 0 the entire map fits in a single 256x256 tile (pyramid
level 0). `IMAGE_SIZE` is therefore `256`: it equals the tile size so
that one Leaflet zoom step doubles the displayed pixels and lines up
directly with one pyramid level.

### Game → Leaflet LatLng

The **playable area** is a 750,000 cm square in Unreal units:

- `WORLD_X_MIN = -324,700`, `WORLD_X_MAX = 425,300` (west → east)
- `WORLD_Y_MIN = -375,000`, `WORLD_Y_MAX = 375,000` (south → north)

(Constants derived from
[`Hirashi3630/satisfactory_node_heatmap`](https://github.com/Hirashi3630/satisfactory_node_heatmap)
and verified against known node counts, e.g. 127 Iron Ore, 62 Coal,
94 Limestone.)

`gameToLatLng(gameX, gameY)` linearly maps that rectangle onto the
Leaflet image bounds `[[-IMAGE_SIZE, 0], [0, IMAGE_SIZE]]`:

- `lng = ((gameX - WORLD_X_MIN) / X_RANGE) * IMAGE_SIZE`
  → `0` at west, `IMAGE_SIZE` at east.
- `lat = ((gameY - WORLD_Y_MIN) / Y_RANGE) * IMAGE_SIZE - IMAGE_SIZE`
  → `-IMAGE_SIZE` at south, `0` at north.

### Why `lat` goes negative southward

Leaflet `CRS.Simple` uses a **y-up** convention (see the
[official CRS.Simple example](https://leafletjs.com/examples/crs-simple/crs-simple.html)),
while XYZ tile pyramids (produced by `gdal2tiles.py --xyz`) use the
**y-down** convention with `y = 0` at the top.

If the map's top edge sat at positive lat, CRS.Simple would project it
to a *negative* pixel-y (because its default transformation is
`(1, 0, -1, 0)`), which in turn would make `TileLayer` compute
*negative* tile y indices (requests like `/3/5/-4.webp`, all 404). Put
north at `lat = 0` and south at `lat = -IMAGE_SIZE` and pixel-y stays
in `[0, IMAGE_SIZE]` over the image → tile y indices land in
`[0, IMAGE_SIZE / 256)`, exactly what the pyramid on disk serves.

### Leaflet zoom ↔ tile pyramid zoom

`IMAGE_SIZE = 256` (= tile size) makes Leaflet zoom line up with the
pyramid zoom 1:1. No offset needed: Leaflet zoom `N` asks the tile
layer for pyramid zoom `N`, and the image is displayed at
`IMAGE_SIZE * 2^N = 256 * 2^N` px.

| Leaflet zoom | Image displayed (px) | Tile URL zoom | Tiles per side |
|---|---|---|---|
| 0 (MIN_ZOOM)  |   256 | 0 |   1 |
| 2 (DEFAULT)   |  1024 | 2 |   4 |
| 4             |  4096 | 4 |  16 |
| 6             | 16384 | 6 |  64 |
| 7 (MAX_ZOOM)  | 32768 | 7 | 128 |

### Swapping the source image

If you replace the source with a render that has a **different
framing** (different crop of the world), re-tune the `WORLD_*` bounds
so markers land on the right biomes. If you change the **resolution**
(e.g. a new 64k upscale), extend the pyramid by one level and bump
`MAX_ZOOM`; `IMAGE_SIZE` and the `WORLD_*` bounds stay the same.
The current 32k upscale preserves the original framing of
`world-map-5k.png`, so no re-tuning was needed.

## Tile pyramid + CDN

The map is served as an 8-level WebP tile pyramid (zoom 0 to 7, 256x256
tiles, XYZ numbering) hosted on **DigitalOcean Spaces**:

- Space: `satisfactory-logistics-maps` (region `fra1`).
- CDN edge base URL: `https://satisfactory-logistics-maps.fra1.cdn.digitaloceanspaces.com`
- Published path (current version): `/map/v2/{z}/{x}/{y}.webp`
- Full URL example: `https://satisfactory-logistics-maps.fra1.cdn.digitaloceanspaces.com/map/v2/0/0/0.webp`

This is the default base URL baked into
[`WorldMapView.tsx`](../../../src/map/WorldMapView.tsx); it can be
overridden via the `VITE_MAP_TILES_BASE_URL` env var (see
[Environment configuration](#environment-configuration)).

### 1. Regenerate the tile pyramid

Prerequisites: `gdal` on PATH (`brew install gdal`, tested with GDAL
3.12.3). The source PNG must be square (the current source is
32768x32768).

```
npm run generate-map-tiles -- /path/to/source.png --max-zoom=7
```

The path argument is required. `--max-zoom` defaults to 6 (for a 16k
source); set it to `log2(width / 256)` for other sizes (7 for 32k, 8
for 64k). The script wipes and re-creates `dist-map-tiles/` at the
repo root (gitignored) and invokes `gdal2tiles.py` with
`--profile=raster --xyz --tiledriver=WEBP --webp-quality=80
--resampling=lanczos`. Expected output for a 32k source: 21845 WebP
tiles, ~50 MB on disk.

### 2. Upload to DigitalOcean Spaces (rclone)

The upload is done with `rclone`. A remote named
`do-satisfactory-logistics-maps` is already configured in
`~/.config/rclone/rclone.conf` (see [rclone S3 docs](https://rclone.org/s3/#digitalocean-spaces)
for recreating it on a new machine). Verify the layout:

```
rclone lsd do-satisfactory-logistics-maps:
```

Then upload the generated pyramid under a fresh version prefix
(current production is `v2`; bump to `v3` on the next regeneration):

```
rclone copy \
  dist-map-tiles/ \
  do-satisfactory-logistics-maps:satisfactory-logistics-maps/map/v2/ \
  --header-upload "Cache-Control: public, max-age=31536000, immutable" \
  --s3-acl public-read \
  --transfers 16 \
  --checkers 32 \
  --progress
```

If the rclone remote is configured to already point at the bucket, drop
the bucket segment:
`do-satisfactory-logistics-maps:map/v2/`.

Notes:

- `--s3-acl public-read` makes each object world-readable (the CDN
  returns HTTP 403 otherwise).
- `Content-Type: image/webp` is auto-detected by rclone from the
  extension.
- `--transfers 16 --checkers 32` speeds up the upload across 20000+
  small files (32k source).

### 3. Verify

```
curl -I https://satisfactory-logistics-maps.fra1.cdn.digitaloceanspaces.com/map/v2/0/0/0.webp
curl -I -H 'Origin: https://satisfactory-logistics.xyz' \
     https://satisfactory-logistics-maps.fra1.cdn.digitaloceanspaces.com/map/v2/0/0/0.webp
```

Expected:

- `HTTP/2 200`
- `content-type: image/webp`
- `cache-control: public, max-age=31536000, immutable`
- `access-control-allow-origin: https://satisfactory-logistics.xyz`

Spot-check visually by opening a few tile URLs in a browser:

- `…/map/v2/0/0/0.webp` shows the entire map shrunk to 256x256.
- `…/map/v2/7/64/64.webp` shows a native-resolution tile near the
  center.

### 4. Versioning

Tiles are published under a versioned prefix (`/map/v1/`, `/map/v2/`,
…). On every regeneration, publish to the next version and update
`VITE_MAP_TILES_BASE_URL` to match. This avoids any cache invalidation:
old clients keep pointing at the previous version until they reload,
new builds use the new path.

### One-time DO Spaces setup

If the Space is being provisioned from scratch:

1. Create a Space named `satisfactory-logistics-maps` in region `fra1`.
2. Enable the CDN (default TTL is fine, e.g. 3600s).
3. Configure CORS (Dashboard → Spaces → Settings → CORS Configuration):
   - Origin: `https://satisfactory-logistics.xyz` and `http://localhost:5173`
   - Allowed Methods: `GET`, `HEAD`
   - Allowed Headers: `*`
   - Max Age: `3600`
4. Create a Spaces access key (Dashboard → API → Spaces access keys)
   and configure the `do-satisfactory-logistics-maps` remote in rclone
   with those credentials.

## Environment configuration

The production CDN URL is the default, so no env var is required. To
point the app at a different CDN (dev bucket, new `/v2/` rollout,
mirror, etc.) set `VITE_MAP_TILES_BASE_URL` at build-time:

- **Local dev**: add to `.env` (gitignored), then restart Vite. Example:
  ```
  VITE_MAP_TILES_BASE_URL=https://<some-other-cdn>/map/v2
  ```
- **Production (Render.com)**: set the key in the static site's
  Environment settings. Because it is consumed at build-time
  (`import.meta.env.*`), it must be set **before** the build that
  ships the change.
