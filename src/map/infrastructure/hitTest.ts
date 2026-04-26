import type {
  ParsedInfrastructure,
  SplineKind,
} from '@/recipes/savegame/ParseSavegameMessages';

export interface BuildingHit {
  kind: 'building';
  index: number;
  /** game cm */
  positionGame: { x: number; y: number };
  /** game cm, base elevation (transform.translation.z). */
  z: number;
  /** game cm */
  size: { width: number; length: number };
  /** game cm, height of the building. */
  height: number;
  yaw: number;
  typePath: string;
  categoryIndex: number;
}

export interface SplineHit {
  kind: 'spline';
  /** Block within `infrastructure.splines`. */
  blockIndex: number;
  /** Polyline within the block. */
  polylineIndex: number;
  splineKind: SplineKind;
  splineTier: number;
}

export type Hit = BuildingHit | SplineHit;

/**
 * Returns the topmost building (greatest `z + height`) whose oriented
 * rectangle contains the given world point. Picking by physical
 * elevation (rather than footprint area) lets a constructor stacked
 * on a mid-rise foundation win the hit over the foundation, and keeps
 * an upper-floor machine on top of a building below it. Ties on
 * elevation fall back to the smaller footprint so a machine still
 * wins over a same-height neighbour.
 */
export function hitTestBuildings(
  infra: ParsedInfrastructure,
  visibleByCat: boolean[],
  worldX: number,
  worldY: number,
): BuildingHit | null {
  const {
    count,
    categories,
    positionsXY,
    positionsZ,
    yaw,
    sizeWL,
    heights,
    typePaths,
  } = infra.buildings;
  let bestTopZ = -Infinity;
  let bestArea = Infinity;
  let bestIdx = -1;

  for (let i = 0; i < count; i++) {
    const catIdx = categories[i];
    if (!visibleByCat[catIdx]) continue;

    const cx = positionsXY[i * 2];
    const cy = positionsXY[i * 2 + 1];
    const halfW = sizeWL[i * 2] / 2;
    const halfL = sizeWL[i * 2 + 1] / 2;

    // Inverse rotation: project the world point into the building's
    // local frame, then check against an axis-aligned half-extents box.
    const a = -yaw[i];
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    const dx = worldX - cx;
    const dy = worldY - cy;
    const localX = dx * cosA - dy * sinA;
    const localY = dx * sinA + dy * cosA;
    if (Math.abs(localX) > halfW || Math.abs(localY) > halfL) continue;

    const topZ = positionsZ[i] + heights[i];
    const area = halfW * halfL;
    if (topZ > bestTopZ || (topZ === bestTopZ && area < bestArea)) {
      bestTopZ = topZ;
      bestArea = area;
      bestIdx = i;
    }
  }

  if (bestIdx === -1) return null;
  return {
    kind: 'building',
    index: bestIdx,
    positionGame: {
      x: positionsXY[bestIdx * 2],
      y: positionsXY[bestIdx * 2 + 1],
    },
    z: positionsZ[bestIdx],
    size: {
      width: sizeWL[bestIdx * 2],
      length: sizeWL[bestIdx * 2 + 1],
    },
    height: heights[bestIdx],
    yaw: yaw[bestIdx],
    typePath: typePaths[bestIdx],
    categoryIndex: categories[bestIdx],
  };
}

function pointToSegmentDistanceSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) {
    const dx = px - ax;
    const dy = py - ay;
    return dx * dx + dy * dy;
  }
  const t = Math.max(
    0,
    Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lenSq),
  );
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy;
}

/**
 * Closest spline polyline within `thresholdGameCm` of the world point.
 * Returns null if nothing is within reach. Skipped spline kinds whose
 * visibility is off so hovering a hidden network doesn't pop tooltips.
 */
export function hitTestSplines(
  infra: ParsedInfrastructure,
  splineVisible: (kind: SplineKind) => boolean,
  worldX: number,
  worldY: number,
  thresholdGameCm: number,
): SplineHit | null {
  const thresholdSq = thresholdGameCm * thresholdGameCm;
  let bestDistSq = thresholdSq;
  let bestBlock = -1;
  let bestPolyline = -1;

  for (let b = 0; b < infra.splines.length; b++) {
    const block = infra.splines[b];
    if (!splineVisible(block.kind)) continue;
    if (block.count === 0) continue;
    const { offsets, pointsXY } = block;
    for (let i = 0; i < block.count; i++) {
      const start = offsets[i];
      const end = offsets[i + 1];
      if (end - start < 2) continue;
      let prevX = pointsXY[start * 2];
      let prevY = pointsXY[start * 2 + 1];
      for (let j = start + 1; j < end; j++) {
        const nx = pointsXY[j * 2];
        const ny = pointsXY[j * 2 + 1];
        const d2 = pointToSegmentDistanceSq(
          worldX,
          worldY,
          prevX,
          prevY,
          nx,
          ny,
        );
        if (d2 < bestDistSq) {
          bestDistSq = d2;
          bestBlock = b;
          bestPolyline = i;
        }
        prevX = nx;
        prevY = ny;
      }
    }
  }

  if (bestBlock === -1) return null;
  const block = infra.splines[bestBlock];
  return {
    kind: 'spline',
    blockIndex: bestBlock,
    polylineIndex: bestPolyline,
    splineKind: block.kind,
    splineTier: block.tier,
  };
}

/**
 * Total length of a spline polyline in game cm. Used in the hover
 * popover so the player can see a "how much belt did this stretch
 * eat" number without leaving the map.
 */
export function splinePolylineLengthCm(
  infra: ParsedInfrastructure,
  blockIndex: number,
  polylineIndex: number,
): number {
  const block = infra.splines[blockIndex];
  const start = block.offsets[polylineIndex];
  const end = block.offsets[polylineIndex + 1];
  let total = 0;
  for (let j = start + 1; j < end; j++) {
    const dx = block.pointsXY[j * 2] - block.pointsXY[(j - 1) * 2];
    const dy = block.pointsXY[j * 2 + 1] - block.pointsXY[(j - 1) * 2 + 1];
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}
