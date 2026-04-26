import type { SatisfactorySave } from '@etothepii/satisfactory-file-parser';
import { categoryFor } from '@/map/infrastructure/infrastructureCategories';
import { quaternionToYaw } from '@/map/infrastructure/quaternion';
import {
  INFRASTRUCTURE_CATEGORIES,
  type InfrastructureBuildingsBlock,
  type InfrastructureCategory,
  type InfrastructureSplinesBlock,
  type ParsedInfrastructure,
  SPLINE_KINDS,
  type SplineKind,
} from '../ParseSavegameMessages';
import { classifyTypePath } from './classifyTypePath';
import { getClearance } from './getClearance';
import { buildAbsolutePolyline, buildRotatedPolyline } from './polyline';
import { readPowerLineWires, readSplineLocations } from './readSaveProperties';
import {
  type BuildableSubsystemLike,
  LIGHTWEIGHT_SUBSYSTEM_TYPEPATH,
  type SaveEntityLike,
  type Vec4,
} from './types';

interface SplineBucket {
  kind: SplineKind;
  tier: number;
  /** Each polyline is a flat [x0,y0,x1,y1,...] number[]. */
  polylines: number[][];
}

/**
 * Mutable state passed across {@link ingestEntity} calls during a
 * streaming parse. The worker creates one of these via
 * {@link createInfrastructureAccumulator}, feeds each `SaveEntity` from
 * the JSON stream into {@link ingestEntity}, then converts the final
 * state into typed arrays via {@link finalizeInfrastructure}.
 */
export interface InfrastructureAccumulator {
  splineBuckets: Map<string, SplineBucket>;
  counts: Record<InfrastructureCategory, number>;
  splineCounts: Record<SplineKind, number>;
  bCategories: number[];
  bPositionsX: number[];
  bPositionsY: number[];
  bPositionsZ: number[];
  bYaws: number[];
  bSizesW: number[];
  bSizesL: number[];
  bHeights: number[];
  bTypePaths: string[];
}

function emptyCategoryCounts(): Record<InfrastructureCategory, number> {
  const counts = {} as Record<InfrastructureCategory, number>;
  for (const cat of INFRASTRUCTURE_CATEGORIES) counts[cat] = 0;
  return counts;
}

function emptySplineCounts(): Record<SplineKind, number> {
  const counts = {} as Record<SplineKind, number>;
  for (const kind of SPLINE_KINDS) counts[kind] = 0;
  return counts;
}

export function createInfrastructureAccumulator(): InfrastructureAccumulator {
  return {
    splineBuckets: new Map(),
    counts: emptyCategoryCounts(),
    splineCounts: emptySplineCounts(),
    bCategories: [],
    bPositionsX: [],
    bPositionsY: [],
    bPositionsZ: [],
    bYaws: [],
    bSizesW: [],
    bSizesL: [],
    bHeights: [],
    bTypePaths: [],
  };
}

function getOrCreateBucket(
  acc: InfrastructureAccumulator,
  kind: SplineKind,
  tier: number,
): SplineBucket {
  const key = `${kind}|${tier}`;
  let bucket = acc.splineBuckets.get(key);
  if (!bucket) {
    bucket = { kind, tier, polylines: [] };
    acc.splineBuckets.set(key, bucket);
  }
  return bucket;
}

function pushBuilding(
  acc: InfrastructureAccumulator,
  typePath: string,
  tx: number,
  ty: number,
  tz: number,
  yaw: number,
): void {
  const category = categoryFor(typePath);
  const { width, length, height } = getClearance(typePath);
  acc.bCategories.push(INFRASTRUCTURE_CATEGORIES.indexOf(category));
  acc.bPositionsX.push(tx);
  acc.bPositionsY.push(ty);
  acc.bPositionsZ.push(tz);
  acc.bYaws.push(yaw);
  acc.bSizesW.push(width);
  acc.bSizesL.push(length);
  acc.bHeights.push(height);
  acc.bTypePaths.push(typePath);
  acc.counts[category]++;
}

/**
 * Processes a single object from the save (a `SaveEntity` or
 * `SaveComponent` shape, as produced by the WHATWG JSON streaming
 * parse). Updates the accumulator in place. Non-`SaveEntity` objects
 * and non-buildable entities are silently skipped, which matches the
 * pre-streaming behaviour of {@link extractInfrastructure}.
 *
 * Drilling into `FGLightweightBuildableSubsystem.specialProperties.
 * buildables[].instances[]` happens here too: in U1.0+ saves
 * thousands of foundation/wall/decor instances are aggregated into
 * a single SaveEntity rather than appearing as standalone entries.
 */
export function ingestEntity(
  acc: InfrastructureAccumulator,
  rawObj: unknown,
): void {
  const obj = rawObj as SaveEntityLike;
  if (obj.type !== 'SaveEntity') return;
  const typePath = obj.typePath;
  if (typeof typePath !== 'string') return;

  if (typePath === LIGHTWEIGHT_SUBSYSTEM_TYPEPATH) {
    const sp = obj.specialProperties as BuildableSubsystemLike | undefined;
    if (sp?.type === 'BuildableSubsystemSpecialProperties' && sp.buildables) {
      for (const group of sp.buildables) {
        const groupTypePath = group.typeReference?.pathName;
        if (typeof groupTypePath !== 'string' || !group.instances) continue;
        for (const inst of group.instances) {
          const itr = inst.transform?.translation;
          const itx = typeof itr?.x === 'number' ? itr.x : 0;
          const ity = typeof itr?.y === 'number' ? itr.y : 0;
          const itz = typeof itr?.z === 'number' ? itr.z : 0;
          const irot = inst.transform?.rotation;
          const iyaw =
            irot &&
            typeof irot.x === 'number' &&
            typeof irot.y === 'number' &&
            typeof irot.z === 'number' &&
            typeof irot.w === 'number'
              ? quaternionToYaw(irot as Vec4)
              : 0;
          pushBuilding(acc, groupTypePath, itx, ity, itz, iyaw);
        }
      }
    }
    return;
  }

  if (!typePath.includes('/Buildable/')) return;

  const tr = obj.transform?.translation;
  const tx = typeof tr?.x === 'number' ? tr.x : 0;
  const ty = typeof tr?.y === 'number' ? tr.y : 0;
  const tz = typeof tr?.z === 'number' ? tr.z : 0;

  const rot = obj.transform?.rotation;
  const yaw =
    rot &&
    typeof rot.x === 'number' &&
    typeof rot.y === 'number' &&
    typeof rot.z === 'number' &&
    typeof rot.w === 'number'
      ? quaternionToYaw(rot as Vec4)
      : 0;

  const cls = classifyTypePath(typePath);

  if (cls.mode === 'spline') {
    const points = readSplineLocations(obj.properties);
    if (points) {
      const bucket = getOrCreateBucket(acc, cls.kind, cls.tier);
      bucket.polylines.push(buildRotatedPolyline(tx, ty, yaw, points));
      acc.splineCounts[cls.kind]++;
      return;
    }
    // mSplineData missing: fall through to building treatment so
    // the entity still appears as a marker on the map.
  } else if (cls.mode === 'powerline') {
    const wires = readPowerLineWires(obj.properties);
    if (wires.length > 0) {
      const bucket = getOrCreateBucket(acc, 'power', 0);
      for (const wire of wires) {
        bucket.polylines.push(buildAbsolutePolyline(wire));
        acc.splineCounts.power++;
      }
      return;
    }
    // No wire data: render as building marker so it isn't lost.
  }

  pushBuilding(acc, typePath, tx, ty, tz, yaw);
}

/**
 * Converts the JS-array accumulators into the flat typed-array layout
 * the canvas layer renders directly. Splits the spline buckets into
 * one block per (kind, tier) pair with a CSR offset index.
 */
export function finalizeInfrastructure(
  acc: InfrastructureAccumulator,
): ParsedInfrastructure {
  const count = acc.bYaws.length;
  const positionsXY = new Float32Array(count * 2);
  const sizeWL = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    positionsXY[i * 2] = acc.bPositionsX[i];
    positionsXY[i * 2 + 1] = acc.bPositionsY[i];
    sizeWL[i * 2] = acc.bSizesW[i];
    sizeWL[i * 2 + 1] = acc.bSizesL[i];
  }
  const buildings: InfrastructureBuildingsBlock = {
    count,
    categories: Uint8Array.from(acc.bCategories),
    positionsXY,
    positionsZ: Float32Array.from(acc.bPositionsZ),
    yaw: Float32Array.from(acc.bYaws),
    sizeWL,
    heights: Float32Array.from(acc.bHeights),
    typePaths: acc.bTypePaths,
  };

  const splines: InfrastructureSplinesBlock[] = [];
  for (const bucket of acc.splineBuckets.values()) {
    const polylineCount = bucket.polylines.length;
    const offsets = new Uint32Array(polylineCount + 1);
    let totalPoints = 0;
    for (let i = 0; i < polylineCount; i++) {
      offsets[i] = totalPoints;
      totalPoints += bucket.polylines[i].length / 2;
    }
    offsets[polylineCount] = totalPoints;
    const pointsXY = new Float32Array(totalPoints * 2);
    const polylineBounds = new Float32Array(polylineCount * 4);
    let cursor = 0;
    for (let i = 0; i < polylineCount; i++) {
      const flat = bucket.polylines[i];
      pointsXY.set(flat, cursor);
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let j = 0; j < flat.length; j += 2) {
        const x = flat[j];
        const y = flat[j + 1];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      polylineBounds[i * 4] = minX;
      polylineBounds[i * 4 + 1] = minY;
      polylineBounds[i * 4 + 2] = maxX;
      polylineBounds[i * 4 + 3] = maxY;
      cursor += flat.length;
    }
    splines.push({
      kind: bucket.kind,
      tier: bucket.tier,
      count: polylineCount,
      offsets,
      pointsXY,
      polylineBounds,
    });
  }

  return {
    buildings,
    splines,
    counts: acc.counts,
    splineCounts: acc.splineCounts,
  };
}

/**
 * Walks every level / object in the save once, classifies each entity,
 * and produces a payload of typed arrays the canvas layer can render
 * without any further per-entity work. Splits into three branches:
 *
 *   - Spline networks (belts, pipes, hyper tubes, rails): read
 *     `mSplineData` and rotate/translate the local-frame points into
 *     world coordinates.
 *   - Power lines: read `mWireInstances` (already in world space).
 *   - Everything else: a footprinted building, with per-entity
 *     position / rotation / size / typePath captured for hit-testing.
 *
 * Foundations / walls / decor live inside a single
 * `FGLightweightBuildableSubsystem` SaveEntity in U1.0+ saves; the
 * loop drills into its `BuildableSubsystemSpecialProperties.buildables`
 * and treats each instance as a regular building.
 *
 * Thin wrapper around the streaming-friendly accumulator API
 * ({@link createInfrastructureAccumulator}, {@link ingestEntity},
 * {@link finalizeInfrastructure}) used by tests and any callsite that
 * already has the full save in memory.
 */
export function extractInfrastructure(
  save: SatisfactorySave,
): ParsedInfrastructure {
  const acc = createInfrastructureAccumulator();
  for (const level of Object.values(save.levels)) {
    for (const obj of level.objects) {
      ingestEntity(acc, obj);
    }
  }
  return finalizeInfrastructure(acc);
}
