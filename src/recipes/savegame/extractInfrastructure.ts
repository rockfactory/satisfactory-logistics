import type { SatisfactorySave } from '@etothepii/satisfactory-file-parser';
import { loglev } from '@/core/logger/log';
import {
  buildingIdFromTypePath,
  categoryFor,
} from '@/map/infrastructure/infrastructureCategories';
import { quaternionToYaw } from '@/map/infrastructure/quaternion';
import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import {
  INFRASTRUCTURE_CATEGORIES,
  type InfrastructureBuildingsBlock,
  type InfrastructureCategory,
  type InfrastructureSplinesBlock,
  type ParsedInfrastructure,
  SPLINE_KINDS,
  type SplineKind,
} from './ParseSavegameMessages';

const logger = loglev.getLogger('extract-infrastructure');

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Vec4 extends Vec3 {
  w: number;
}

interface SplineClassification {
  mode: 'spline';
  kind: SplineKind;
  tier: number;
}

interface PowerLineClassification {
  mode: 'powerline';
}

interface BuildingClassification {
  mode: 'building';
}

type Classification =
  | SplineClassification
  | PowerLineClassification
  | BuildingClassification;

const RE_BELT = /Build_ConveyorBelt(?:Mk(\d+))?_C$/;
const RE_HYPER = /Build_PipelineHyper.*_C$/;
const RE_PIPE = /Build_Pipeline(?:MK(\d+))?(?:_NoIndicator)?_C$/;
const RE_RAIL = /Build_RailroadTrack(?:Integrated)?_C$/;
const RE_POWER_LINE = /Build_PowerLine.*_C$/;

const FALLBACK_CLEARANCE_CM = 800;

/** Clearance fields in `FactoryBuildings.json` are in metres (game UI
 * unit), but the savegame transforms are in centimetres (Unreal native
 * unit) — multiply to compare apples to apples. */
const CLEARANCE_M_TO_CM = 100;

/**
 * Hand-tuned clearances (in cm) for connector buildings whose entry in
 * `FactoryBuildings.json` is either absent or has a `null` clearance.
 * The default 8x8m fallback paints these as factory-sized blobs over
 * the conveyors/pipes they actually serve as 1x1m attach points.
 */
const HARDCODED_CLEARANCE_CM: Record<
  string,
  { width: number; length: number }
> = {
  Build_ConveyorPole_C: { width: 100, length: 100 },
  Build_ConveyorPoleStackable_C: { width: 100, length: 100 },
  Build_ConveyorPoleWall_C: { width: 100, length: 100 },
  Build_ConveyorCeilingAttachment_C: { width: 100, length: 100 },
  Build_PipelineSupport_C: { width: 100, length: 100 },
  Build_PipelineSupportWall_C: { width: 100, length: 100 },
  Build_PipelineSupportWallHole_C: { width: 100, length: 100 },
  Build_PipelineFlowIndicator_C: { width: 100, length: 100 },
};

const SMALL_CLEARANCE_PATTERNS = [/Pole/, /Support/, /FlowIndicator/];

function classifyTypePath(typePath: string): Classification {
  const belt = typePath.match(RE_BELT);
  if (belt) {
    const tier = belt[1] ? Number.parseInt(belt[1], 10) : 1;
    return { mode: 'spline', kind: 'belt', tier };
  }
  if (RE_HYPER.test(typePath)) {
    return { mode: 'spline', kind: 'hyper', tier: 0 };
  }
  const pipe = typePath.match(RE_PIPE);
  if (pipe) {
    const tier = pipe[1] ? Number.parseInt(pipe[1], 10) : 1;
    return { mode: 'spline', kind: 'pipe', tier };
  }
  if (RE_RAIL.test(typePath)) {
    return { mode: 'spline', kind: 'rail', tier: 0 };
  }
  if (RE_POWER_LINE.test(typePath)) {
    return { mode: 'powerline' };
  }
  return { mode: 'building' };
}

function readSplineLocations(
  properties: Record<string, unknown> | undefined,
): Vec3[] | null {
  const sd = (
    properties as { mSplineData?: { values?: unknown[] } } | undefined
  )?.mSplineData;
  if (!sd || !Array.isArray(sd.values)) return null;
  const out: Vec3[] = [];
  for (const sp of sd.values) {
    const loc = (
      sp as
        | {
            properties?: { Location?: { value?: Partial<Vec3> } };
          }
        | undefined
    )?.properties?.Location?.value;
    if (
      !loc ||
      typeof loc.x !== 'number' ||
      typeof loc.y !== 'number' ||
      !Number.isFinite(loc.x) ||
      !Number.isFinite(loc.y)
    ) {
      continue;
    }
    out.push({ x: loc.x, y: loc.y, z: typeof loc.z === 'number' ? loc.z : 0 });
  }
  return out.length >= 2 ? out : null;
}

function readPowerLineWires(
  properties: Record<string, unknown> | undefined,
): Vec3[][] {
  const wires = (
    properties as { mWireInstances?: { values?: unknown[] } } | undefined
  )?.mWireInstances;
  if (!wires || !Array.isArray(wires.values)) return [];
  const out: Vec3[][] = [];
  for (const wire of wires.values) {
    const locs = (
      wire as { properties?: { Locations?: unknown[] } } | undefined
    )?.properties?.Locations;
    if (!Array.isArray(locs)) continue;
    const points: Vec3[] = [];
    for (const item of locs) {
      const v = (item as { value?: Partial<Vec3> } | undefined)?.value;
      if (
        !v ||
        typeof v.x !== 'number' ||
        typeof v.y !== 'number' ||
        !Number.isFinite(v.x) ||
        !Number.isFinite(v.y)
      ) {
        continue;
      }
      points.push({ x: v.x, y: v.y, z: typeof v.z === 'number' ? v.z : 0 });
    }
    if (points.length >= 2) out.push(points);
  }
  return out;
}

function getClearance(typePath: string): { width: number; length: number } {
  const id = buildingIdFromTypePath(typePath);
  if (id) {
    const override = HARDCODED_CLEARANCE_CM[id];
    if (override) return override;
    const b = AllFactoryBuildingsMap[id];
    if (b?.clearance) {
      const { width, length } = b.clearance;
      if (width > 0 && length > 0) {
        return {
          width: width * CLEARANCE_M_TO_CM,
          length: length * CLEARANCE_M_TO_CM,
        };
      }
    }
    // Catalog had a null clearance (or no entry at all) — pick a 1m
    // footprint for the connector-shaped buildings (poles, supports,
    // flow indicators) instead of the 8m factory default.
    if (SMALL_CLEARANCE_PATTERNS.some(re => re.test(id))) {
      return { width: 100, length: 100 };
    }
  }
  return { width: FALLBACK_CLEARANCE_CM, length: FALLBACK_CLEARANCE_CM };
}

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
 * Builds a flat polyline (xy interleaved) from a list of locations
 * relative to a building's transform, applying the building's yaw to
 * align them with world axes.
 */
function buildRotatedPolyline(
  tx: number,
  ty: number,
  yaw: number,
  points: Vec3[],
): number[] {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const flat = new Array<number>(points.length * 2);
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    flat[i * 2] = tx + p.x * cy - p.y * sy;
    flat[i * 2 + 1] = ty + p.x * sy + p.y * cy;
  }
  return flat;
}

function buildAbsolutePolyline(points: Vec3[]): number[] {
  const flat = new Array<number>(points.length * 2);
  for (let i = 0; i < points.length; i++) {
    flat[i * 2] = points[i].x;
    flat[i * 2 + 1] = points[i].y;
  }
  return flat;
}

interface SaveEntityLike {
  type?: string;
  typePath?: unknown;
  transform?: {
    translation?: Partial<Vec3>;
    rotation?: Partial<Vec4>;
  };
  properties?: Record<string, unknown>;
  specialProperties?: { type?: unknown } & Record<string, unknown>;
}

interface BuildableInstanceLike {
  transform?: {
    translation?: Partial<Vec3>;
    rotation?: Partial<Vec4>;
  };
}

interface BuildableSubsystemLike {
  type?: string;
  buildables?: Array<{
    typeReference?: { pathName?: unknown };
    instances?: BuildableInstanceLike[];
  }>;
}

const LIGHTWEIGHT_SUBSYSTEM_TYPEPATH =
  '/Script/FactoryGame.FGLightweightBuildableSubsystem';

export function extractInfrastructure(
  save: SatisfactorySave,
): ParsedInfrastructure {
  const splineBuckets = new Map<string, SplineBucket>();
  const counts = emptyCategoryCounts();
  const splineCounts = emptySplineCounts();

  // Building accumulators (one parallel array per field, grown as we go).
  const bCategories: number[] = [];
  const bPositions: number[] = [];
  const bYaws: number[] = [];
  const bSizes: number[] = [];
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

  function pushBuilding(typePath: string, tx: number, ty: number, yaw: number) {
    const category = categoryFor(typePath);
    const { width, length } = getClearance(typePath);
    bCategories.push(INFRASTRUCTURE_CATEGORIES.indexOf(category));
    bPositions.push(tx, ty);
    bYaws.push(yaw);
    bSizes.push(width, length);
    bTypePaths.push(typePath);
    counts[category]++;
    if (
      logger.getLevel() <= 1 /* trace/debug */ &&
      /Build_(Train|RailroadSwitch)/.test(typePath)
    ) {
      const yawDeg = ((yaw * 180) / Math.PI).toFixed(1);
      logger.debug(`station yaw ${yawDeg}°`, typePath, { tx, ty });
    }
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
              const irot = inst.transform?.rotation;
              const iyaw =
                irot &&
                typeof irot.x === 'number' &&
                typeof irot.y === 'number' &&
                typeof irot.z === 'number' &&
                typeof irot.w === 'number'
                  ? quaternionToYaw(irot as Vec4)
                  : 0;
              pushBuilding(groupTypePath, itx, ity, iyaw);
            }
          }
        }
        continue;
      }

      if (!typePath.includes('/Buildable/')) continue;

      const tr = obj.transform?.translation;
      const tx = typeof tr?.x === 'number' ? tr.x : 0;
      const ty = typeof tr?.y === 'number' ? tr.y : 0;

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

      pushBuilding(typePath, tx, ty, yaw);
    }
  }

  const buildings: InfrastructureBuildingsBlock = {
    count: bYaws.length,
    categories: Uint8Array.from(bCategories),
    positionsXY: Float32Array.from(bPositions),
    yaw: Float32Array.from(bYaws),
    sizeWL: Float32Array.from(bSizes),
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
