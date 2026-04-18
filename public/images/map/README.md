# World map asset

The `Map` page (`src/map/`) renders a Satisfactory world map. Starting
from this revision the backdrop is no longer a single static image, but a
**WebP tile pyramid** served from a CDN. `public/images/map/` keeps only
static fallbacks and documentation; the tile pyramid itself lives on
DigitalOcean Spaces (see [below](#tile-pyramid--cdn)).

## Map image: source and license

The tile pyramid is derived from an in-game extraction of the
MASSAGE-2 (AB)b world map (8192x8192 PNG), upscaled 2x with AI to
16384x16384. The map artwork is the intellectual property of Coffee Stain
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

The map is treated as a 2048x2048 logical coordinate space (unrelated
to the tile pyramid's pixel resolution, see next section), framed so
that the playable Satisfactory world fills the canvas. The
world-to-image transform lives in
[`src/map/coords.ts`](../../../src/map/coords.ts) and treats the
playable area as a 750,000 cm square:

- `X_MIN = -324,700`, `X_MAX = 425,300`
- `Y_MIN = -375,000`, `Y_MAX = 375,000`

The Y axis is flipped when projecting to image pixels so that the
in-game compass north (`+Y`) is at the top of the image, matching the
convention used by the source dataset and the wiki render. These
constants come from the same heatmap project and have been verified
against the wiki's known resource node counts (e.g. 127 Iron Ore
nodes, 62 Coal nodes, 94 Limestone nodes).

The 16384 upscale preserves the original framing exactly (same crop,
same aspect), so these constants do not change. **If you swap the
source image for a render with different framing, re-tune the world
bounds in `coords.ts`** so resource node markers land on the right
biomes.

## Tile pyramid + CDN

The map is served as a 7-level WebP tile pyramid (zoom 0 to 6, 256x256
tiles, XYZ numbering) hosted on **DigitalOcean Spaces**:

- Space: `satisfactory-logistics-maps` (region `fra1`).
- CDN edge base URL: `https://satisfactory-logistics-maps.fra1.cdn.digitaloceanspaces.com`
- Published path (current version): `/map/v1/{z}/{x}/{y}.webp`
- Full URL example: `https://satisfactory-logistics-maps.fra1.cdn.digitaloceanspaces.com/map/v1/0/0/0.webp`

The app reads the base URL from the Vite env variable
`VITE_MAP_TILES_BASE_URL` (see [Environment configuration](#environment-configuration)).

### 1. Regenerate the tile pyramid

Prerequisites: `gdal` on PATH (`brew install gdal`, tested with GDAL
3.12.3). The source PNG must be square (the current source is
16384x16384).

```
npm run generate-map-tiles -- /path/to/source.png
```

The path argument is required. The script wipes and re-creates
`dist-map-tiles/` at the repo root
(gitignored) and invokes `gdal2tiles.py` with
`--profile=raster --xyz -z 0-6 --tiledriver=WEBP --webp-quality=80
--resampling=lanczos`. Expected output: 5461 WebP tiles, around 100 to
250 MB on disk.

### 2. Upload to DigitalOcean Spaces (rclone)

The upload is done with `rclone`. A remote named
`do-satisfactory-logistics-maps` is already configured in
`~/.config/rclone/rclone.conf` (see [rclone S3 docs](https://rclone.org/s3/#digitalocean-spaces)
for recreating it on a new machine). Verify the layout:

```
rclone lsd do-satisfactory-logistics-maps:
```

Then upload the generated pyramid under a fresh version prefix (`v1`
for the current drop, bump to `v2` when you regenerate):

```
rclone copy \
  dist-map-tiles/ \
  do-satisfactory-logistics-maps:satisfactory-logistics-maps/map/v1/ \
  --header-upload "Cache-Control: public, max-age=31536000, immutable" \
  --s3-acl public-read \
  --transfers 16 \
  --checkers 32 \
  --progress
```

If the rclone remote is configured to already point at the bucket, drop
the bucket segment:
`do-satisfactory-logistics-maps:map/v1/`.

Notes:

- `--s3-acl public-read` makes each object world-readable (the CDN
  returns HTTP 403 otherwise).
- `Content-Type: image/webp` is auto-detected by rclone from the
  extension.
- `--transfers 16 --checkers 32` speeds up the upload across 5000+
  small files.

### 3. Verify

```
curl -I https://satisfactory-logistics-maps.fra1.cdn.digitaloceanspaces.com/map/v1/0/0/0.webp
curl -I -H 'Origin: https://satisfactory-logistics.xyz' \
     https://satisfactory-logistics-maps.fra1.cdn.digitaloceanspaces.com/map/v1/0/0/0.webp
```

Expected:

- `HTTP/2 200`
- `content-type: image/webp`
- `cache-control: public, max-age=31536000, immutable`
- `access-control-allow-origin: https://satisfactory-logistics.xyz`

Spot-check visually by opening a few tile URLs in a browser:

- `…/map/v1/0/0/0.webp` shows the entire map shrunk to 256x256.
- `…/map/v1/6/32/32.webp` shows a native-resolution tile near the
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

The app reads the CDN base URL from Vite at build-time:

- **Local dev**: add to `.env` (gitignored):
  ```
  VITE_MAP_TILES_BASE_URL=https://satisfactory-logistics-maps.fra1.cdn.digitaloceanspaces.com/map/v1
  ```
- **Production (Render.com)**: set the same key/value in the static
  site's Environment settings. Because it is consumed at build-time
  (`import.meta.env.*`), it must be set **before** the build that
  ships the change.
