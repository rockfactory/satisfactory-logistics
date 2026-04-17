# World map asset

`world-map.jpg` is the backdrop rendered by the `Map` page (`src/map/`).

## Map image: source and license

The image is the official top-down map of MASSAGE-2 (AB)b, sourced
from the [Satisfactory Wiki](https://satisfactory.wiki.gg/wiki/Map)
(file `Map.jpg`, 2048x2048 variant). The map artwork is the
intellectual property of Coffee Stain Studios and is reproduced here
for reference under fair use, consistent with how community Satisfactory
tools (e.g. [satisfactory-calculator.com](https://satisfactory-calculator.com))
use the same asset.

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

The map is 2048x2048 and is framed so that the playable Satisfactory
world fills the canvas. The world-to-image transform lives in
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

If you swap the image for a different render, only the constants in
`coords.ts` need to change.

## Replacing the image

1. Drop a square JPG/PNG (recommended 2048x2048 or larger) at
   `public/images/map/world-map.jpg` (or update the URL in
   [`src/map/WorldMapView.tsx`](../../../src/map/WorldMapView.tsx) if
   the extension changes).
2. Verify the licensing of the replacement asset before committing it.
3. Re-tune the world bounds in `coords.ts` so resource node markers
   land on the right biomes.
