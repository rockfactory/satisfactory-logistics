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
 */
export function extractInfrastructure(
  save: SatisfactorySave,
): ParsedInfrastructure {
  const splineBuckets = new Map<string, SplineBucket>();
  const counts = emptyCategoryCounts();
  const splineCounts = emptySplineCounts();

  // Building accumulators (one parallel array per field, grown as we go).
  const bCategories: number[] = [];
  const bPositions: number[] = [];
  const bPositionsZ: number[] = [];
  const bYaws: number[] = [];
  const bSizes: number[] = [];
  const bHeights: number[] = [];
  const bTypePaths: string[] = [];

  function getOrCreateBucket(kind: SplineKind, tier: number): SplineBucket {
    const key = `${kind}|${tier}`;
    let bucket = splineBuckets.get(key);
    if (!bucket) {
      bucket = { kind, tier, polylines: [] };
      splineBuckets.set(key, bucket);
    }
    return bucket;
  }

  function pushBuilding(
    typePath: string,
    tx: number,
    ty: number,
    tz: number,
    yaw: number,
  ) {
    const category = categoryFor(typePath);
    const { width, length, height } = getClearance(typePath);
    bCategories.push(INFRASTRUCTURE_CATEGORIES.indexOf(category));
    bPositions.push(tx, ty);
    bPositionsZ.push(tz);
    bYaws.push(yaw);
    bSizes.push(width, length);
    bHeights.push(height);
    bTypePaths.push(typePath);
    counts[category]++;
  }

  for (const level of Object.values(save.levels)) {
    for (const rawObj of level.objects) {
      const obj = rawObj as unknown as SaveEntityLike;
      if (obj.type !== 'SaveEntity') continue;
      const typePath = obj.typePath;
      if (typeof typePath !== 'string') continue;

      // Satisfactory 1.0+ collapses thousands of foundation / wall /
      // decor instances into a single `FGLightweightBuildableSubsystem`
      // SaveEntity to keep .sav file sizes manageable. The actual
      // buildables live in `specialProperties.buildables[].instances[]`
      // and never appear as standalone SaveEntities, so we have to walk
      // that nested array explicitly.
      if (typePath === LIGHTWEIGHT_SUBSYSTEM_TYPEPATH) {
        const sp = obj.specialProperties as BuildableSubsystemLike | undefined;
        if (
          sp?.type === 'BuildableSubsystemSpecialProperties' &&
          sp.buildables
        ) {
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
              pushBuilding(groupTypePath, itx, ity, itz, iyaw);
            }
          }
        }
        continue;
      }

      if (!typePath.includes('/Buildable/')) continue;

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
          const bucket = getOrCreateBucket(cls.kind, cls.tier);
          bucket.polylines.push(buildRotatedPolyline(tx, ty, yaw, points));
          splineCounts[cls.kind]++;
          continue;
        }
        // mSplineData missing: fall through to building treatment so
        // the entity still appears as a marker on the map.
      } else if (cls.mode === 'powerline') {
        const wires = readPowerLineWires(obj.properties);
        if (wires.length > 0) {
          const bucket = getOrCreateBucket('power', 0);
          for (const wire of wires) {
            bucket.polylines.push(buildAbsolutePolyline(wire));
            splineCounts.power++;
          }
          continue;
        }
        // No wire data: render as building marker so it isn't lost.
      }

      pushBuilding(typePath, tx, ty, tz, yaw);
    }
  }

  const buildings: InfrastructureBuildingsBlock = {
    count: bYaws.length,
    categories: Uint8Array.from(bCategories),
    positionsXY: Float32Array.from(bPositions),
    positionsZ: Float32Array.from(bPositionsZ),
    yaw: Float32Array.from(bYaws),
    sizeWL: Float32Array.from(bSizes),
    heights: Float32Array.from(bHeights),
    typePaths: bTypePaths,
  };

  const splines: InfrastructureSplinesBlock[] = [];
  for (const bucket of splineBuckets.values()) {
    const count = bucket.polylines.length;
    const offsets = new Uint32Array(count + 1);
    let totalPoints = 0;
    for (let i = 0; i < count; i++) {
      offsets[i] = totalPoints;
      totalPoints += bucket.polylines[i].length / 2;
    }
    offsets[count] = totalPoints;
    const pointsXY = new Float32Array(totalPoints * 2);
    let cursor = 0;
    for (let i = 0; i < count; i++) {
      const flat = bucket.polylines[i];
      pointsXY.set(flat, cursor);
      cursor += flat.length;
    }
    splines.push({
      kind: bucket.kind,
      tier: bucket.tier,
      count,
      offsets,
      pointsXY,
    });
  }

  return { buildings, splines, counts, splineCounts };
}
