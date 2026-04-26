import L from 'leaflet';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMap } from 'react-leaflet';
import { loglev } from '@/core/logger/log';
import { useStore } from '@/core/zustand';
import {
  INFRASTRUCTURE_CATEGORIES,
  type InfrastructureCategory,
  type ParsedInfrastructure,
  SPLINE_KINDS,
  type SplineKind,
} from '@/recipes/savegame/ParseSavegameMessages';
import { gameToLatLng, latLngToGame } from '../coords';
import {
  type Hit,
  hitTestBuildings,
  hitTestSplines,
  splinePolylineLengthCm,
} from './hitTest';
import { InfrastructureHoverPopover } from './InfrastructureHoverPopover';
import { CategoryColor, splineColor } from './infrastructureCategories';

const logger = loglev.getLogger('map:infrastructure-layer');

interface RenderState {
  master: boolean;
  infrastructure: ParsedInfrastructure | null;
  /** May be missing keys / undefined entirely if a save predates the
   * v10 store migration; treat absent as visible everywhere. */
  categoryVisibility: Partial<Record<InfrastructureCategory, boolean>> | null;
  splineVisibility: Partial<Record<SplineKind, boolean>> | null;
}

interface AffineGameToContainer {
  ox: number;
  oy: number;
  /** Pixel per game cm along the world's X axis. */
  ax: number;
  /** Pixel per game cm along the world's Y axis. */
  by: number;
}

const HIDDEN_CATEGORIES_BY_ZOOM: Array<[number, InfrastructureCategory[]]> = [
  // Foundations + decor are usually >70% of the entity count on
  // endgame saves and at low zoom collapse into illegible blobs;
  // hiding them keeps the factory cores readable and dramatically
  // reduces per-tile draw work.
  [3, ['foundation', 'decor']],
  [2, ['storage']],
];

const BIN_DEDUP_PX = 4;

function splineStepForZoom(zoom: number): number {
  if (zoom < 2) return 8;
  if (zoom < 3) return 4;
  if (zoom < 4) return 2;
  return 1;
}

function categoryHiddenByLOD(
  zoom: number,
  category: InfrastructureCategory,
): boolean {
  for (const [zMax, hidden] of HIDDEN_CATEGORIES_BY_ZOOM) {
    if (zoom < zMax && hidden.includes(category)) return true;
  }
  return false;
}

const AFFINE_PROBE_CM = 100_000;

function computeAffine(map: L.Map): AffineGameToContainer {
  const origin = map.latLngToContainerPoint(gameToLatLng(0, 0));
  const xUnit = map.latLngToContainerPoint(gameToLatLng(AFFINE_PROBE_CM, 0));
  const yUnit = map.latLngToContainerPoint(gameToLatLng(0, AFFINE_PROBE_CM));
  return {
    ox: origin.x,
    oy: origin.y,
    ax: (xUnit.x - origin.x) / AFFINE_PROBE_CM,
    by: (yUnit.y - origin.y) / AFFINE_PROBE_CM,
  };
}

// ---- Spatial index ---------------------------------------------------------

const SPATIAL_CELL_CM = 10_000;

/**
 * Fixed-grid spatial index over a `ParsedInfrastructure`. Bucketing by
 * a coarse worldspace grid (default 100 m cells) lets each tile fetch
 * just the buildings + spline polylines it actually paints in O(cells)
 * — the dominant per-tile cost ends up being the rasterisation, not
 * the lookup.
 *
 * Building bucketing keys by the entity's centre (no half-extent
 * inflation): the consumer is expected to query with a small
 * worldspace pad (~50 m, the largest hand-tuned clearance) so a
 * building straddling the tile edge still gets picked up.
 *
 * Spline polylines are inserted into every cell their AABB intersects,
 * and `querySplines` dedups via a `Set` so a polyline that runs across
 * multiple cells in the query range is returned once.
 */
class SpatialIndex {
  readonly cellSizeCm: number;
  private readonly buildingsByCell: Map<number, Uint32Array>;
  private readonly splinesByCell: Map<number, Uint32Array>;

  constructor(infra: ParsedInfrastructure, cellSizeCm = SPATIAL_CELL_CM) {
    this.cellSizeCm = cellSizeCm;

    const buildingTmp = new Map<number, number[]>();
    const { positionsXY, count } = infra.buildings;
    for (let i = 0; i < count; i++) {
      const x = positionsXY[i * 2];
      const y = positionsXY[i * 2 + 1];
      const key = SpatialIndex.cellKey(
        Math.floor(x / cellSizeCm),
        Math.floor(y / cellSizeCm),
      );
      let arr = buildingTmp.get(key);
      if (!arr) {
        arr = [];
        buildingTmp.set(key, arr);
      }
      arr.push(i);
    }
    this.buildingsByCell = new Map();
    for (const [k, arr] of buildingTmp) {
      this.buildingsByCell.set(k, Uint32Array.from(arr));
    }

    const splineTmp = new Map<number, number[]>();
    for (let blockIdx = 0; blockIdx < infra.splines.length; blockIdx++) {
      const block = infra.splines[blockIdx];
      const { polylineBounds } = block;
      for (let polyIdx = 0; polyIdx < block.count; polyIdx++) {
        const minX = polylineBounds[polyIdx * 4];
        const minY = polylineBounds[polyIdx * 4 + 1];
        const maxX = polylineBounds[polyIdx * 4 + 2];
        const maxY = polylineBounds[polyIdx * 4 + 3];
        const cMinX = Math.floor(minX / cellSizeCm);
        const cMinY = Math.floor(minY / cellSizeCm);
        const cMaxX = Math.floor(maxX / cellSizeCm);
        const cMaxY = Math.floor(maxY / cellSizeCm);
        // Pack `(blockIdx, polyIdx)` into one 32-bit ref so a single
        // Uint32Array per cell carries the lookup payload.
        const ref = (blockIdx << 20) | (polyIdx & 0xfffff);
        for (let cx = cMinX; cx <= cMaxX; cx++) {
          for (let cy = cMinY; cy <= cMaxY; cy++) {
            const key = SpatialIndex.cellKey(cx, cy);
            let arr = splineTmp.get(key);
            if (!arr) {
              arr = [];
              splineTmp.set(key, arr);
            }
            arr.push(ref);
          }
        }
      }
    }
    this.splinesByCell = new Map();
    for (const [k, arr] of splineTmp) {
      this.splinesByCell.set(k, Uint32Array.from(arr));
    }
  }

  /** Returns building indices whose centre falls in any cell intersecting
   * the query bbox. Caller pads the bbox to compensate for the centre-
   * only insertion. */
  queryBuildings(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  ): number[] {
    const cMinX = Math.floor(minX / this.cellSizeCm);
    const cMinY = Math.floor(minY / this.cellSizeCm);
    const cMaxX = Math.floor(maxX / this.cellSizeCm);
    const cMaxY = Math.floor(maxY / this.cellSizeCm);
    const out: number[] = [];
    for (let cx = cMinX; cx <= cMaxX; cx++) {
      for (let cy = cMinY; cy <= cMaxY; cy++) {
        const arr = this.buildingsByCell.get(SpatialIndex.cellKey(cx, cy));
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) out.push(arr[i]);
      }
    }
    return out;
  }

  /** Returns packed `(blockIdx<<20 | polyIdx)` refs deduped across cells. */
  querySplines(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  ): number[] {
    const cMinX = Math.floor(minX / this.cellSizeCm);
    const cMinY = Math.floor(minY / this.cellSizeCm);
    const cMaxX = Math.floor(maxX / this.cellSizeCm);
    const cMaxY = Math.floor(maxY / this.cellSizeCm);
    const seen = new Set<number>();
    for (let cx = cMinX; cx <= cMaxX; cx++) {
      for (let cy = cMinY; cy <= cMaxY; cy++) {
        const arr = this.splinesByCell.get(SpatialIndex.cellKey(cx, cy));
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) seen.add(arr[i]);
      }
    }
    return [...seen];
  }

  private static cellKey(cx: number, cy: number): number {
    // `(cx + 32768) * 65536 + (cy + 32768)` keeps the key positive and
    // collision-free for any worldspace within ±32768 cells (= ±3.3·10^8 cm
    // at 10 000 cm cells, i.e. ±3300 km — many orders of magnitude
    // larger than Satisfactory's playable area).
    return (cx + 32768) * 65536 + (cy + 32768);
  }
}

// ---- Tile painters ---------------------------------------------------------

/** Worldspace pad (cm) used when querying the spatial index for a tile,
 * so a building or spline whose centre / bbox sits just outside the
 * tile but whose footprint extends into it still gets drawn. ~50 m
 * covers the largest hand-tuned clearances. */
const TILE_QUERY_PAD_CM = 5000;

function paintTileBuildings(
  ctx: CanvasRenderingContext2D,
  infra: ParsedInfrastructure,
  indices: number[],
  a: AffineGameToContainer,
  zoom: number,
  state: RenderState,
): void {
  if (indices.length === 0) return;
  const { categories, positionsXY, yaw, sizeWL } = infra.buildings;

  const visibleByCat: boolean[] = INFRASTRUCTURE_CATEGORIES.map(
    cat =>
      (state.categoryVisibility?.[cat] ?? true) &&
      !categoryHiddenByLOD(zoom, cat),
  );

  const paths: (Path2D | null)[] = INFRASTRUCTURE_CATEGORIES.map(() => null);
  const dotCells: (Set<number> | null)[] = INFRASTRUCTURE_CATEGORIES.map(
    () => null,
  );

  for (let k = 0; k < indices.length; k++) {
    const i = indices[k];
    const catIdx = categories[i];
    if (!visibleByCat[catIdx]) continue;

    const gx = positionsXY[i * 2];
    const gy = positionsXY[i * 2 + 1];
    const widthCm = sizeWL[i * 2];
    const lengthCm = sizeWL[i * 2 + 1];

    const cx = a.ox + gx * a.ax;
    const cy = a.oy + gy * a.by;
    const halfW = (widthCm / 2) * Math.abs(a.ax);
    const halfL = (lengthCm / 2) * Math.abs(a.by);

    if (halfW < BIN_DEDUP_PX && halfL < BIN_DEDUP_PX) {
      // The bin is only the *dedup key* — two buildings of the same
      // category landing in the same bin paint just one dot. The dot
      // itself is drawn at the building's real footprint size (with a
      // 0.5 px floor so a sub-pixel building still shows up as a 1 px
      // dot). Snapping the rect to the bin would make small buildings
      // look 4-8x bigger than they are at low zoom (e.g. a beam
      // connector showing up as a chunky 4x4 blob).
      const binX = Math.floor(cx / BIN_DEDUP_PX);
      const binY = Math.floor(cy / BIN_DEDUP_PX);
      const key = ((binX + 32768) << 16) | ((binY + 32768) & 0xffff);
      let cellSet = dotCells[catIdx];
      if (!cellSet) {
        cellSet = new Set();
        dotCells[catIdx] = cellSet;
      }
      if (cellSet.has(key)) continue;
      cellSet.add(key);
      let path = paths[catIdx];
      if (!path) {
        path = new Path2D();
        paths[catIdx] = path;
      }
      const drawHalfW = Math.max(halfW, 0.5);
      const drawHalfL = Math.max(halfL, 0.5);
      path.rect(cx - drawHalfW, cy - drawHalfL, drawHalfW * 2, drawHalfL * 2);
      continue;
    }

    const angle = yaw[i];
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const dx = halfW * cosA;
    const dy = halfW * sinA;
    const ex = -halfL * sinA;
    const ey = halfL * cosA;
    let path = paths[catIdx];
    if (!path) {
      path = new Path2D();
      paths[catIdx] = path;
    }
    path.moveTo(cx - dx - ex, cy - dy - ey);
    path.lineTo(cx + dx - ex, cy + dy - ey);
    path.lineTo(cx + dx + ex, cy + dy + ey);
    path.lineTo(cx - dx + ex, cy - dy + ey);
    path.closePath();
  }

  for (let c = 0; c < INFRASTRUCTURE_CATEGORIES.length; c++) {
    const path = paths[c];
    if (!path) continue;
    const cat = INFRASTRUCTURE_CATEGORIES[c];
    const color = CategoryColor[cat];
    // `other` joins foundation/decor in the quiet bucket: it's a
    // catch-all that mostly contains tiny connector / accessory
    // entities (beam connectors, supports, indicators) which would
    // otherwise dominate the map at low zoom.
    const quiet = cat === 'foundation' || cat === 'decor' || cat === 'other';
    ctx.fillStyle = color;
    ctx.globalAlpha = quiet ? 0.12 : 0.35;
    ctx.fill(path);
    ctx.globalAlpha = quiet ? 0.6 : 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = quiet ? 0.75 : 1.5;
    ctx.stroke(path);
  }
  ctx.globalAlpha = 1;
}

function paintTileSplines(
  ctx: CanvasRenderingContext2D,
  infra: ParsedInfrastructure,
  splineRefs: number[],
  a: AffineGameToContainer,
  zoom: number,
  state: RenderState,
): void {
  if (zoom < 1 || splineRefs.length === 0) return;

  const baseLineWidth = zoom >= 6 ? 3 : zoom >= 4 ? 2 : zoom >= 2 ? 1.25 : 1;
  const lineWidthMultiplier: Record<SplineKind, number> = {
    belt: 1,
    pipe: 1,
    hyper: 1,
    rail: 1.8,
    power: 0.75,
  };

  const step = splineStepForZoom(zoom);
  // One Path2D per (kind, tier) block so each colour/lineWidth pair
  // rasterises in a single `stroke` call.
  const pathsByBlock = new Map<number, Path2D>();

  for (let k = 0; k < splineRefs.length; k++) {
    const ref = splineRefs[k];
    const blockIdx = ref >>> 20;
    const polyIdx = ref & 0xfffff;
    const block = infra.splines[blockIdx];
    if (!block) continue;
    if (!SPLINE_KINDS.includes(block.kind)) continue;
    if ((state.splineVisibility?.[block.kind] ?? true) === false) continue;

    const start = block.offsets[polyIdx];
    const end = block.offsets[polyIdx + 1];
    if (end - start < 2) continue;

    let path = pathsByBlock.get(blockIdx);
    if (!path) {
      path = new Path2D();
      pathsByBlock.set(blockIdx, path);
    }

    const { pointsXY, tangentsXY } = block;
    const useBezier = step === 1 && tangentsXY != null;
    const sx = a.ox + pointsXY[start * 2] * a.ax;
    const sy = a.oy + pointsXY[start * 2 + 1] * a.by;
    path.moveTo(sx, sy);

    if (useBezier) {
      const t = tangentsXY;
      let p0x = sx;
      let p0y = sy;
      for (let j = start + 1; j < end; j++) {
        const p1x = a.ox + pointsXY[j * 2] * a.ax;
        const p1y = a.oy + pointsXY[j * 2 + 1] * a.by;
        const leaveX = (t[(j - 1) * 4 + 2] * a.ax) / 3;
        const leaveY = (t[(j - 1) * 4 + 3] * a.by) / 3;
        const arriveX = (t[j * 4] * a.ax) / 3;
        const arriveY = (t[j * 4 + 1] * a.by) / 3;
        path.bezierCurveTo(
          p0x + leaveX,
          p0y + leaveY,
          p1x - arriveX,
          p1y - arriveY,
          p1x,
          p1y,
        );
        p0x = p1x;
        p0y = p1y;
      }
      continue;
    }

    let lastDX = sx;
    let lastDY = sy;
    const lastIdx = end - 1;
    for (let j = start + step; j < lastIdx; j += step) {
      const px = a.ox + pointsXY[j * 2] * a.ax;
      const py = a.oy + pointsXY[j * 2 + 1] * a.by;
      const dx = px - lastDX;
      const dy = py - lastDY;
      if (dx * dx + dy * dy < 1) continue;
      path.lineTo(px, py);
      lastDX = px;
      lastDY = py;
    }
    const lx = a.ox + pointsXY[lastIdx * 2] * a.ax;
    const ly = a.oy + pointsXY[lastIdx * 2 + 1] * a.by;
    const ldx = lx - lastDX;
    const ldy = ly - lastDY;
    if (ldx * ldx + ldy * ldy >= 1 || end - start === 2) {
      path.lineTo(lx, ly);
    }
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [blockIdx, path] of pathsByBlock) {
    const block = infra.splines[blockIdx];
    ctx.strokeStyle = splineColor(block.kind, block.tier);
    ctx.lineWidth = baseLineWidth * lineWidthMultiplier[block.kind];
    ctx.stroke(path);
  }
}

// ---- Highlight (hover) -----------------------------------------------------

function drawHighlight(
  ctx: CanvasRenderingContext2D,
  infra: ParsedInfrastructure,
  a: AffineGameToContainer,
  hit: Hit,
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (hit.kind === 'building') {
    const cx = a.ox + hit.positionGame.x * a.ax;
    const cy = a.oy + hit.positionGame.y * a.by;
    const halfW = (hit.size.width / 2) * Math.abs(a.ax);
    const halfL = (hit.size.length / 2) * Math.abs(a.by);
    const angle = hit.yaw;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const dx = halfW * cosA;
    const dy = halfW * sinA;
    const ex = -halfL * sinA;
    const ey = halfL * cosA;

    const path = new Path2D();
    path.moveTo(cx - dx - ex, cy - dy - ey);
    path.lineTo(cx + dx - ex, cy + dy - ey);
    path.lineTo(cx + dx + ex, cy + dy + ey);
    path.lineTo(cx - dx + ex, cy - dy + ey);
    path.closePath();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 4;
    ctx.stroke(path);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke(path);
    ctx.restore();
    return;
  }

  const block = infra.splines[hit.blockIndex];
  if (!block) {
    ctx.restore();
    return;
  }
  const start = block.offsets[hit.polylineIndex];
  const end = block.offsets[hit.polylineIndex + 1];
  if (end - start < 2) {
    ctx.restore();
    return;
  }
  const path = new Path2D();
  const sx = a.ox + block.pointsXY[start * 2] * a.ax;
  const sy = a.oy + block.pointsXY[start * 2 + 1] * a.by;
  path.moveTo(sx, sy);
  for (let j = start + 1; j < end; j++) {
    const px = a.ox + block.pointsXY[j * 2] * a.ax;
    const py = a.oy + block.pointsXY[j * 2 + 1] * a.by;
    path.lineTo(px, py);
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 6;
  ctx.stroke(path);
  ctx.strokeStyle = splineColor(block.kind, block.tier);
  ctx.lineWidth = 3;
  ctx.stroke(path);

  ctx.restore();
}

type HoverPayload = {
  hit: Hit | null;
  mousePx: { x: number; y: number } | null;
};

// ---- GridLayer (tile-based main renderer) ---------------------------------

/**
 * Tile-based renderer for the imported infrastructure. By extending
 * `L.GridLayer` we get the entire production-grade pipeline that
 * Leaflet uses for its base map: viewport-only tile creation, CSS
 * scale during zoom transitions (so pinch / scroll-zoom stay 60 fps
 * even on an endgame save), automatic tile recycling, and culling of
 * tiles outside the current bounds. Per-tile cost is bounded by the
 * spatial index, so the heaviest single piece of work is the tile
 * paint itself (small, fits well inside one frame) rather than a
 * monolithic full-canvas redraw.
 */
const InfrastructureGridLayer = L.GridLayer.extend({
  options: {
    tileSize: 256,
    // No `minZoom` / `maxZoom`: the layer should track the live map at
    // any zoom level, including past the basemap pyramid's
    // `MAX_ZOOM` of 7 (Leaflet still allows scrolling further in).
    // Spatial-index lookups stay cheap even at high zoom because each
    // tile covers a tiny worldspace bbox.
    // Keep the default keepBuffer (2): one extra row/col of tiles
    // around the viewport so a small pan never shows a blank rim
    // before new tiles render.
  },

  initialize(this: GridLayerInternals, options?: L.GridLayerOptions) {
    // `L.GridLayer.prototype.initialize` exists at runtime (it's how
    // every Leaflet class boots) but isn't declared in the `@types`
    // because the `extend()` factory normally hides it from authors.
    (
      L.GridLayer.prototype as unknown as {
        initialize?: (opts?: L.GridLayerOptions) => void;
      }
    ).initialize?.call(this, options);
    this._spatialIndex = null;
    this._renderState = null;
  },

  setRenderState(this: GridLayerInternals, state: RenderState) {
    const previous = this._renderState;
    this._renderState = state;
    const previousInfra = previous?.infrastructure ?? null;
    const nowInfra = state.infrastructure;
    if (previousInfra !== nowInfra) {
      this._spatialIndex = nowInfra ? new SpatialIndex(nowInfra) : null;
      if (nowInfra) {
        logger.info(
          'spatial index built',
          `${nowInfra.buildings.count} buildings,`,
          `${nowInfra.splines.reduce((s, b) => s + b.count, 0)} polylines`,
        );
      }
    }
    // Anything that affects what a tile paints requires re-rendering
    // every visible tile. `redraw()` (a method on L.GridLayer) drops
    // the existing tile cache and re-creates them on demand.
    if (
      !previous ||
      previous.master !== state.master ||
      previous.infrastructure !== state.infrastructure ||
      previous.categoryVisibility !== state.categoryVisibility ||
      previous.splineVisibility !== state.splineVisibility
    ) {
      this.redraw();
    }
  },

  createTile(
    this: GridLayerInternals,
    coords: L.Coords,
    done: (error: Error | undefined, tile: HTMLElement) => void,
  ): HTMLCanvasElement {
    const tile = L.DomUtil.create('canvas') as HTMLCanvasElement;
    const tileSize = this.getTileSize();
    const dpr = window.devicePixelRatio || 1;
    tile.width = tileSize.x * dpr;
    tile.height = tileSize.y * dpr;
    tile.style.width = `${tileSize.x}px`;
    tile.style.height = `${tileSize.y}px`;

    // Defer the actual rasterisation by one rAF so a burst of new
    // tiles (e.g. on zoom-in) doesn't all run inside the same frame.
    // Leaflet shows the previous-zoom tiles scaled-up until `done`
    // fires, so the user sees a smooth zoom rather than a blank rim.
    requestAnimationFrame(() => {
      try {
        this._renderTile(tile, coords);
        done(undefined, tile);
      } catch (e) {
        done(e as Error, tile);
      }
    });
    return tile;
  },

  _renderTile(
    this: GridLayerInternals,
    canvas: HTMLCanvasElement,
    coords: L.Coords,
  ): void {
    const state = this._renderState;
    if (!state?.master || !state.infrastructure) return;
    const idx = this._spatialIndex;
    if (!idx) return;

    const tileSize = this.getTileSize();
    const dpr = window.devicePixelRatio || 1;
    const zoom = coords.z;

    const map = (this as unknown as { _map: L.Map | null })._map;
    if (!map) return;

    // Compute this tile's worldspace bbox by unprojecting its corners.
    // `coords.scaleBy(tileSize)` returns the NW pixel of the tile in
    // the layer's global pixel space at zoom `coords.z`.
    const nwPoint = coords.scaleBy(tileSize);
    const sePoint = nwPoint.add(tileSize);
    const nwLatLng = map.unproject(nwPoint, zoom);
    const seLatLng = map.unproject(sePoint, zoom);
    const nwGame = latLngToGame(nwLatLng);
    const seGame = latLngToGame(seLatLng);
    const tileMinX = Math.min(nwGame.x, seGame.x);
    const tileMaxX = Math.max(nwGame.x, seGame.x);
    const tileMinY = Math.min(nwGame.y, seGame.y);
    const tileMaxY = Math.max(nwGame.y, seGame.y);

    if (tileMaxX - tileMinX <= 0 || tileMaxY - tileMinY <= 0) return;

    // Affine: world cm → tile pixel (CSS units, the 2D ctx is scaled
    // by dpr below). Tile (0, 0) is the corner with smaller game x
    // and smaller game y in our `gameToLatLng` orientation.
    const ax = tileSize.x / (tileMaxX - tileMinX);
    const by = tileSize.y / (tileMaxY - tileMinY);
    const tileAffine: AffineGameToContainer = {
      ax,
      by,
      ox: -tileMinX * ax,
      oy: -tileMinY * by,
    };

    const queryMinX = tileMinX - TILE_QUERY_PAD_CM;
    const queryMaxX = tileMaxX + TILE_QUERY_PAD_CM;
    const queryMinY = tileMinY - TILE_QUERY_PAD_CM;
    const queryMaxY = tileMaxY + TILE_QUERY_PAD_CM;
    const buildingIndices = idx.queryBuildings(
      queryMinX,
      queryMinY,
      queryMaxX,
      queryMaxY,
    );
    const splineRefs = idx.querySplines(
      queryMinX,
      queryMinY,
      queryMaxX,
      queryMaxY,
    );

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, tileSize.x, tileSize.y);

    paintTileSplines(
      ctx,
      state.infrastructure,
      splineRefs,
      tileAffine,
      zoom,
      state,
    );
    paintTileBuildings(
      ctx,
      state.infrastructure,
      buildingIndices,
      tileAffine,
      zoom,
      state,
    );
  },
}) as unknown as new (
  options?: L.GridLayerOptions,
) => InfrastructureGridLayerType;

interface GridLayerInternals extends L.GridLayer {
  _spatialIndex: SpatialIndex | null;
  _renderState: RenderState | null;
  _renderTile: (canvas: HTMLCanvasElement, coords: L.Coords) => void;
  setRenderState: (state: RenderState) => void;
}

interface InfrastructureGridLayerType extends L.GridLayer {
  setRenderState(state: RenderState): void;
  spatialIndex(): SpatialIndex | null;
}

// ---- Highlight overlay layer (hover hit-test + accent paint) --------------

/**
 * Single-canvas overlay that sits above the GridLayer. It owns the
 * mousemove hit test and paints the accent stroke on the hovered
 * entity. Decoupling it from the main renderer lets us redraw only
 * the tiny highlight on every mousemove without touching the tile
 * cache.
 */
class InfrastructureHighlightLayer extends L.Layer {
  private canvas: HTMLCanvasElement | null = null;
  private state: RenderState | null = null;
  private affine: AffineGameToContainer | null = null;
  private currentZoom = 0;
  private hovered: Hit | null = null;
  private hoverMousePx: { x: number; y: number } | null = null;
  private hoverCallback: ((payload: HoverPayload) => void) | null = null;
  private rafId: number | null = null;
  private isInteracting = false;

  onAdd(map: L.Map): this {
    const canvas = L.DomUtil.create(
      'canvas',
      'leaflet-infrastructure-highlight',
    ) as HTMLCanvasElement;
    canvas.style.position = 'absolute';
    canvas.style.pointerEvents = 'none';
    canvas.style.willChange = 'transform';
    map.getPanes().overlayPane.appendChild(canvas);
    this.canvas = canvas;

    map.on('viewreset moveend zoomend resize', this.scheduleRedraw, this);
    map.on('movestart zoomstart', this.onInteractionStart, this);
    map.on('mousemove', this.handleMouseMove, this);
    map.on('mouseout', this.handleMouseOut, this);
    this.scheduleRedraw();
    return this;
  }

  onRemove(map: L.Map): this {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }
    map.off('viewreset moveend zoomend resize', this.scheduleRedraw, this);
    map.off('movestart zoomstart', this.onInteractionStart, this);
    map.off('mousemove', this.handleMouseMove, this);
    map.off('mouseout', this.handleMouseOut, this);
    return this;
  }

  setState(state: RenderState): void {
    this.state = state;
    if (this.hovered) {
      this.hovered = null;
      this.hoverMousePx = null;
      this.hoverCallback?.({ hit: null, mousePx: null });
    }
    this.scheduleRedraw();
  }

  setHoverCallback(cb: ((payload: HoverPayload) => void) | null): void {
    this.hoverCallback = cb;
  }

  private onInteractionStart = (): void => {
    this.isInteracting = true;
    if (this.hovered) {
      this.hovered = null;
      this.hoverMousePx = null;
      this.hoverCallback?.({ hit: null, mousePx: null });
      this.scheduleRedraw();
    }
  };

  private scheduleRedraw = (): void => {
    this.isInteracting = false;
    if (this.rafId != null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.redraw();
    });
  };

  private handleMouseMove = (event: L.LeafletMouseEvent): void => {
    if (this.isInteracting) return;
    if (!this.state?.master || !this.state.infrastructure || !this.affine) {
      this.updateHover(null, null);
      return;
    }
    const infra = this.state.infrastructure;
    const a = this.affine;
    if (a.ax === 0 || a.by === 0) return;

    const cp = event.containerPoint;
    const worldX = (cp.x - a.ox) / a.ax;
    const worldY = (cp.y - a.oy) / a.by;

    const visibleByCat = INFRASTRUCTURE_CATEGORIES.map(
      cat =>
        (this.state?.categoryVisibility?.[cat] ?? true) &&
        !categoryHiddenByLOD(this.currentZoom, cat),
    );
    const buildingHit = hitTestBuildings(infra, visibleByCat, worldX, worldY);

    let hit: Hit | null = buildingHit;
    if (!hit) {
      const splineThresholdGameCm = 6 / Math.max(Math.abs(a.ax), 1e-9);
      hit = hitTestSplines(
        infra,
        kind => this.state?.splineVisibility?.[kind] ?? true,
        worldX,
        worldY,
        splineThresholdGameCm,
      );
    }

    this.updateHover(hit, { x: cp.x, y: cp.y });
  };

  private handleMouseOut = (): void => {
    this.updateHover(null, null);
  };

  private updateHover(
    hit: Hit | null,
    mousePx: { x: number; y: number } | null,
  ): void {
    const sameHit =
      hit === this.hovered ||
      (hit?.kind === 'building' &&
        this.hovered?.kind === 'building' &&
        hit.index === this.hovered.index) ||
      (hit?.kind === 'spline' &&
        this.hovered?.kind === 'spline' &&
        hit.blockIndex === this.hovered.blockIndex &&
        hit.polylineIndex === this.hovered.polylineIndex);
    const samePx =
      this.hoverMousePx?.x === mousePx?.x &&
      this.hoverMousePx?.y === mousePx?.y;

    this.hovered = hit;
    this.hoverMousePx = mousePx;

    if (!sameHit) this.scheduleRedraw();
    if (!sameHit || !samePx) {
      this.hoverCallback?.({ hit, mousePx });
    }
    this.updateCursor();
  }

  private updateCursor(): void {
    const map = this._map;
    if (!map) return;
    const container = map.getContainer();
    if (this.hovered) {
      container.style.cursor = 'pointer';
    } else if (container.style.cursor === 'pointer') {
      container.style.cursor = '';
    }
  }

  private redraw(): void {
    const canvas = this.canvas;
    const map = this._map;
    if (!canvas || !map) return;

    const size = map.getSize();
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(canvas, topLeft);

    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(size.x * dpr);
    const targetH = Math.round(size.y * dpr);
    if (canvas.width !== targetW) canvas.width = targetW;
    if (canvas.height !== targetH) canvas.height = targetH;
    canvas.style.width = `${size.x}px`;
    canvas.style.height = `${size.y}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.x, size.y);

    const affine = computeAffine(map);
    const zoom = map.getZoom();
    this.affine = affine;
    this.currentZoom = zoom;

    if (this.hovered && this.state?.master && this.state.infrastructure) {
      drawHighlight(ctx, this.state.infrastructure, affine, this.hovered);
    }
  }
}

// ---- Misc helpers ---------------------------------------------------------

function infrastructureLatLngBounds(
  infra: ParsedInfrastructure,
): L.LatLngBounds | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const { buildings, splines } = infra;
  for (let i = 0; i < buildings.count; i++) {
    const x = buildings.positionsXY[i * 2];
    const y = buildings.positionsXY[i * 2 + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  for (const block of splines) {
    const pts = block.pointsXY;
    for (let i = 0; i < pts.length; i += 2) {
      const x = pts[i];
      const y = pts[i + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;

  return L.latLngBounds(gameToLatLng(minX, minY), gameToLatLng(maxX, maxY));
}

// ---- React wrapper --------------------------------------------------------

/**
 * React wrapper around the tile-based grid layer + a thin highlight
 * overlay. Reads the in-memory `mapInfrastructure` slice plus the
 * persisted visibility flags from `mapSlice`, and pushes them into
 * the imperative layers whenever they change. The layers are mounted
 * once per `<MapContainer>` and torn down with the host component.
 */
export function InfrastructureCanvasLayer() {
  const map = useMap();

  const infrastructure = useStore(s => s.mapInfrastructure.infrastructure);
  const ownerGameId = useStore(s => s.mapInfrastructure.gameId);
  const requestedFitAt = useStore(s => s.mapInfrastructure.requestedFitAt);
  const selectedGameId = useStore(s => s.games.selected);
  const master = useStore(s => s.map.infrastructureMaster);
  const categoryVisibility = useStore(
    s => s.map.infrastructureCategoryVisibility,
  );
  const splineVisibility = useStore(s => s.map.infrastructureSplineVisibility);

  const activeInfrastructure =
    ownerGameId != null && ownerGameId === selectedGameId
      ? infrastructure
      : null;

  const gridRef = useRef<InfrastructureGridLayerType | null>(null);
  const highlightRef = useRef<InfrastructureHighlightLayer | null>(null);

  const [hoverHit, setHoverHit] = useState<Hit | null>(null);
  const [hoverMousePx, setHoverMousePx] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const grid = new InfrastructureGridLayer();
    grid.addTo(map);
    const highlight = new InfrastructureHighlightLayer();
    highlight.addTo(map);
    highlight.setHoverCallback(({ hit, mousePx }) => {
      setHoverHit(hit);
      setHoverMousePx(mousePx);
    });
    gridRef.current = grid;
    highlightRef.current = highlight;
    logger.info('infrastructure layers mounted');
    return () => {
      highlight.setHoverCallback(null);
      highlight.remove();
      grid.remove();
      gridRef.current = null;
      highlightRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const state: RenderState = {
      master,
      infrastructure: activeInfrastructure,
      categoryVisibility,
      splineVisibility,
    };
    gridRef.current?.setRenderState(state);
    highlightRef.current?.setState(state);
  }, [master, activeInfrastructure, categoryVisibility, splineVisibility]);

  // Frame the camera on the loaded infrastructure when the slice asks
  // for it (after every fresh import, plus on-demand from the filter
  // panel's "Locate" button). Skipped for empty payloads — fitBounds
  // would throw on a degenerate bounds.
  useEffect(() => {
    if (requestedFitAt == null || !activeInfrastructure) return;
    const bounds = infrastructureLatLngBounds(activeInfrastructure);
    if (!bounds?.isValid()) return;
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
    logger.info('framed camera on infrastructure');
  }, [requestedFitAt, activeInfrastructure, map]);

  const splineLengthCm = useMemo(() => {
    if (!hoverHit || hoverHit.kind !== 'spline' || !activeInfrastructure) {
      return undefined;
    }
    return splinePolylineLengthCm(
      activeInfrastructure,
      hoverHit.blockIndex,
      hoverHit.polylineIndex,
    );
  }, [hoverHit, activeInfrastructure]);

  return createPortal(
    <InfrastructureHoverPopover
      hit={hoverHit}
      mousePx={hoverMousePx}
      splineLengthCm={splineLengthCm}
    />,
    map.getContainer(),
  );
}
