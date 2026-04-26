import L from 'leaflet';
import { useEffect, useRef } from 'react';
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
import { gameToLatLng } from '../coords';
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
  /** Pixel per game cm along the world's Y axis (positive: Leaflet
   * mirrors Y so a positive game Y still produces a positive container
   * Y delta in our setup). */
  by: number;
}

const HIDDEN_CATEGORIES_BY_ZOOM: Array<[number, InfrastructureCategory[]]> = [
  [3, ['decor']],
];

function categoryHiddenByLOD(
  zoom: number,
  category: InfrastructureCategory,
): boolean {
  for (const [zMax, hidden] of HIDDEN_CATEGORIES_BY_ZOOM) {
    if (zoom < zMax && hidden.includes(category)) return true;
  }
  return false;
}

/**
 * Probe distance (in game cm) used to derive the affine transform.
 * Leaflet's `latLngToContainerPoint` rounds the result to integer
 * pixels (`_round()` inside `latLngToLayerPoint`), so probing with a
 * 1-cm delta collapses to 0 px and the per-cm scale ends up zero.
 * 100_000 cm at the lowest supported zoom is still ~0.3 px, but a
 * larger probe + division gives us sub-pixel-accurate ratios
 * regardless of zoom level.
 */
const AFFINE_PROBE_CM = 100_000;

/**
 * Builds the linear transform from game cm to container px. Both
 * `gameToLatLng` and `map.latLngToContainerPoint` are linear in our
 * CRS.Simple setup, so two probes plus the origin nail the affine map
 * down completely. Used in tight inner loops to avoid hammering
 * Leaflet's projection helpers per point.
 */
function computeAffine(map: L.Map): AffineGameToContainer {
  const origin = map.latLngToContainerPoint(gameToLatLng(0, 0));
  const xUnit = map.latLngToContainerPoint(
    gameToLatLng(AFFINE_PROBE_CM, 0),
  );
  const yUnit = map.latLngToContainerPoint(
    gameToLatLng(0, AFFINE_PROBE_CM),
  );
  return {
    ox: origin.x,
    oy: origin.y,
    ax: (xUnit.x - origin.x) / AFFINE_PROBE_CM,
    by: (yUnit.y - origin.y) / AFFINE_PROBE_CM,
  };
}

/**
 * Custom Leaflet layer that renders the user's built infrastructure on
 * a single backing `<canvas>` mounted in the `overlayPane`. Reactive
 * to map view changes (`viewreset` / `zoom` / `move` / `resize`) and
 * to its own state via {@link InfrastructureLayer.update}. Redraws are
 * coalesced through `requestAnimationFrame` so a flurry of pan events
 * collapses into one paint.
 */
class InfrastructureLayer extends L.Layer {
  private canvas: HTMLCanvasElement | null = null;
  private state: RenderState | null = null;
  private rafId: number | null = null;

  onAdd(map: L.Map): this {
    const canvas = L.DomUtil.create(
      'canvas',
      'leaflet-infrastructure-layer',
    ) as HTMLCanvasElement;
    canvas.style.position = 'absolute';
    canvas.style.pointerEvents = 'none';
    canvas.style.willChange = 'transform';
    map.getPanes().overlayPane.appendChild(canvas);
    this.canvas = canvas;
    logger.info('layer mounted on overlayPane');

    map.on('viewreset zoom move resize', this.scheduleRedraw, this);
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
    map.off('viewreset zoom move resize', this.scheduleRedraw, this);
    return this;
  }

  setState(state: RenderState): void {
    const previousHadData = this.state?.infrastructure != null;
    const nowHasData = state.infrastructure != null;
    if (!previousHadData && nowHasData) {
      const infra = state.infrastructure;
      logger.info(
        'received infrastructure',
        infra ? `${infra.buildings.count} buildings` : 'null',
        infra
          ? `${infra.splines.reduce((s, b) => s + b.count, 0)} polylines`
          : '',
      );
    }
    this.state = state;
    this.scheduleRedraw();
  }

  private scheduleRedraw = (): void => {
    if (this.rafId != null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.redraw();
    });
  };

  private redraw(): void {
    const canvas = this.canvas;
    const map = this._map;
    if (!canvas || !map) return;

    const size = map.getSize();
    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(canvas, topLeft);
    if (canvas.width !== size.x) canvas.width = size.x;
    if (canvas.height !== size.y) canvas.height = size.y;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size.x, size.y);

    const state = this.state;
    if (!state?.master || !state.infrastructure) return;

    const affine = computeAffine(map);
    const zoom = map.getZoom();

    if (logger.getLevel() <= 1 /* trace/debug */) {
      const sample = state.infrastructure.buildings;
      if (sample.count > 0) {
        const cx = affine.ox + sample.positionsXY[0] * affine.ax;
        const cy = affine.oy + sample.positionsXY[1] * affine.by;
        logger.debug('redraw', {
          zoom,
          canvasSize: `${canvas.width}x${canvas.height}`,
          firstBuildingPx: `${cx.toFixed(0)},${cy.toFixed(0)}`,
        });
      }
    }

    drawSplines(ctx, state, affine, zoom);
    drawBuildings(ctx, state, affine, zoom);
  }
}

function drawBuildings(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  a: AffineGameToContainer,
  zoom: number,
): void {
  const infra = state.infrastructure;
  if (!infra) return;
  const { count, categories, positionsXY, yaw, sizeWL } = infra.buildings;
  if (count === 0) return;

  const visibleByCat: boolean[] = INFRASTRUCTURE_CATEGORIES.map(
    cat =>
      (state.categoryVisibility?.[cat] ?? true) &&
      !categoryHiddenByLOD(zoom, cat),
  );

  // One Path2D per category lets us collapse N fillStyle / fill cycles
  // into 8: cheap on context state, friendly to compositors.
  const paths: (Path2D | null)[] = INFRASTRUCTURE_CATEGORIES.map(() => null);
  for (let i = 0; i < count; i++) {
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
    if (halfW < 0.5 && halfL < 0.5) {
      // Sub-pixel: skip rotated-rect work, paint a single dot below.
      let path = paths[catIdx];
      if (!path) {
        path = new Path2D();
        paths[catIdx] = path;
      }
      path.rect(cx - 0.5, cy - 0.5, 1, 1);
      continue;
    }

    // Negate yaw because gameToLatLng mirrors the Y axis: a +CCW
    // rotation in game frame becomes -CCW in canvas frame.
    const angle = -yaw[i];
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    // Inline-compose a rotated rectangle into the category's Path2D
    // instead of touching ctx.translate/rotate per building.
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

  // SCIM-style two-pass paint: a translucent fill body keeps adjacent
  // footprints distinguishable without bleeding, and an opaque 1.5 px
  // stroke draws crisp outlines so the actual building shape is
  // readable even when zoomed out (foundations, walls, etc).
  for (let c = 0; c < INFRASTRUCTURE_CATEGORIES.length; c++) {
    const path = paths[c];
    if (!path) continue;
    const color = CategoryColor[INFRASTRUCTURE_CATEGORIES[c]];
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.35;
    ctx.fill(path);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke(path);
  }
}

function drawSplines(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  a: AffineGameToContainer,
  zoom: number,
): void {
  const infra = state.infrastructure;
  if (!infra) return;

  // At extremely low zoom the splines collapse into a smudge: skip
  // them entirely so the resource layer stays readable.
  if (zoom < 1) return;

  const baseLineWidth = zoom >= 6 ? 3 : zoom >= 4 ? 2 : zoom >= 2 ? 1.25 : 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const block of infra.splines) {
    if (!SPLINE_KINDS.includes(block.kind)) continue;
    if ((state.splineVisibility?.[block.kind] ?? true) === false) continue;
    if (block.count === 0) continue;

    const path = new Path2D();
    const { offsets, pointsXY } = block;
    for (let i = 0; i < block.count; i++) {
      const start = offsets[i];
      const end = offsets[i + 1];
      if (end - start < 2) continue;
      const sx = a.ox + pointsXY[start * 2] * a.ax;
      const sy = a.oy + pointsXY[start * 2 + 1] * a.by;
      path.moveTo(sx, sy);
      for (let j = start + 1; j < end; j++) {
        const px = a.ox + pointsXY[j * 2] * a.ax;
        const py = a.oy + pointsXY[j * 2 + 1] * a.by;
        path.lineTo(px, py);
      }
    }
    ctx.strokeStyle = splineColor(block.kind, block.tier);
    ctx.lineWidth =
      block.kind === 'power' ? baseLineWidth * 0.75 : baseLineWidth;
    ctx.stroke(path);
  }
}

/**
 * Computes a Leaflet bounds covering every building + spline polyline
 * in the infrastructure payload. Returns null if the payload contains
 * no usable geometry.
 */
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

  return L.latLngBounds(
    gameToLatLng(minX, minY),
    gameToLatLng(maxX, maxY),
  );
}

/**
 * React wrapper around {@link InfrastructureLayer}. Reads the in-memory
 * `mapInfrastructure` slice plus the persisted visibility flags from
 * `mapSlice`, and pushes them into the imperative layer whenever they
 * change. The layer is mounted once per `<MapContainer>` and torn down
 * with the host component.
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

  // Surface only the in-memory payload that matches the active game.
  // Switching games shouldn't show stale geometry on a different map
  // until the user re-imports.
  const activeInfrastructure =
    ownerGameId != null && ownerGameId === selectedGameId
      ? infrastructure
      : null;

  const layerRef = useRef<InfrastructureLayer | null>(null);

  useEffect(() => {
    const layer = new InfrastructureLayer();
    layer.addTo(map);
    layerRef.current = layer;
    return () => {
      layer.remove();
      layerRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    layerRef.current?.setState({
      master,
      infrastructure: activeInfrastructure,
      categoryVisibility,
      splineVisibility,
    });
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

  return null;
}
