import type { SatisfactorySave } from '@etothepii/satisfactory-file-parser';
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
    const b = AllFactoryBuildingsMap[id];
    if (b?.clearance) {
      const { width, length } = b.clearance;
      if (width > 0 && length > 0) return { width, length };
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
}

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

  function getOrCreateBucket(kind: SplineKind, tier: number): SplineBucket {
    const key = `${kind}|${tier}`;
    let bucket = splineBuckets.get(key);
    if (!bucket) {
      bucket = { kind, tier, polylines: [] };
      splineBuckets.set(key, bucket);
    }
    return bucket;
  }

  for (const level of Object.values(save.levels)) {
    for (const rawObj of level.objects) {
      const obj = rawObj as unknown as SaveEntityLike;
      if (obj.type !== 'SaveEntity') continue;
      const typePath = obj.typePath;
      if (typeof typePath !== 'string') continue;
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

      const category = categoryFor(typePath);
      const { width, length } = getClearance(typePath);
      bCategories.push(INFRASTRUCTURE_CATEGORIES.indexOf(category));
      bPositions.push(tx, ty);
      bYaws.push(yaw);
      bSizes.push(width, length);
      counts[category]++;
    }
  }

  const buildings: InfrastructureBuildingsBlock = {
    count: bYaws.length,
    categories: Uint8Array.from(bCategories),
    positionsXY: Float32Array.from(bPositions),
    yaw: Float32Array.from(bYaws),
    sizeWL: Float32Array.from(bSizes),
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
