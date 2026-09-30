import type { SatisfactorySave } from '@etothepii/satisfactory-file-parser';
import { loglev } from '@/core/logger/log';
import { categoryFor } from '@/map/infrastructure/infrastructureCategories';
import { quaternionToYaw } from '@/map/infrastructure/quaternion';
import {
  type AdditionalBuildingDetails,
  INFRASTRUCTURE_CATEGORIES,
  type InfrastructureBuildingsBlock,
  type InfrastructureCategory,
  type InfrastructureSplinesBlock,
  type ParsedInfrastructure,
  SPLINE_KINDS,
  type SplineKind,
  type Train,
  type TrainStation,
  type TrainStationId,
  type TrainTimetable,
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
  /**
   * Per-polyline Hermite tangents, layout `[aX, aY, lX, lY]` per point.
   * `null` when the polyline came from a source without tangents
   * (power-line wires, fallback lineTo paths).
   */
  tangents: (number[] | null)[];
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
  bInstanceNames: string[];
  /** Overclock multiplier per building (NaN when not applicable). */
  bOverclocks: number[];
  /** Somersloop count per building (0 when not applicable). */
  bSomersloops: number[];
  /** Selected recipe id per building (empty string when none). */
  bRecipes: string[];
  /** Resource node id this building extracts from (empty string when
   * the entity isn't an extractor). */
  bExtractedNodes: string[];
}

export interface AdditionalDetailsAccumulator {
  bTrainDetails: Train[];
  bTrainTimetables: Map<string, TrainTimetable>;
  bTrainStationIds: Map<string, TrainStationId>;
}

const logger = loglev.getLogger('parse-savegame');

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
    bInstanceNames: [],
    bOverclocks: [],
    bSomersloops: [],
    bRecipes: [],
    bExtractedNodes: [],
  };
}

export function createAdditionalDetailsAccumulator(): AdditionalDetailsAccumulator {
  return {
    bTrainDetails: [],
    bTrainTimetables: new Map(),
    bTrainStationIds: new Map(),
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
    bucket = { kind, tier, polylines: [], tangents: [] };
    acc.splineBuckets.set(key, bucket);
  }
  return bucket;
}

function pushBuilding(
  acc: InfrastructureAccumulator,
  typePath: string,
  instanceName: string,
  tx: number,
  ty: number,
  tz: number,
  yaw: number,
  machine: MachineDetails | null = null,
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
  acc.bInstanceNames.push(instanceName);
  acc.bOverclocks.push(machine?.overclock ?? Number.NaN);
  acc.bSomersloops.push(machine?.somersloop ?? 0);
  acc.bRecipes.push(machine?.recipe ?? '');
  acc.bExtractedNodes.push(machine?.extractedNode ?? '');
  acc.counts[category]++;
}

interface MachineDetails {
  overclock: number;
  somersloop: number;
  recipe: string;
  extractedNode: string;
}

/**
 * Pulls overclock / somersloop / recipe out of a `SaveEntity`'s
 * `properties` bag, when the building is the kind that exposes them.
 * Returns null when none of the three are set, so the caller can skip
 * the per-building entry. Failures (missing fields, malformed values)
 * silently fall back to defaults — every machine in a save has a
 * different mix of these properties depending on its tier and on
 * whether the player ever touched it.
 */
function readNumberProperty(value: unknown): number | null {
  const v = (value as { value?: unknown })?.value;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function readObjectPathName(value: unknown): string | null {
  const v = (value as { value?: { pathName?: unknown } })?.value?.pathName;
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function readObjectValueProperty(value: unknown): string | null {
  const v = (value as { value?: { value?: unknown } })?.value?.value;
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function readMachineDetails(
  properties: Record<string, unknown> | undefined,
): MachineDetails | null {
  if (!properties) return null;

  // Overclock — `mCurrentPotential` is the live value, `mPendingPotential`
  // is the slider position the player set; we prefer the live value
  // and fall back so a freshly-cranked machine still shows something.
  const potential =
    readNumberProperty(properties.mCurrentPotential) ??
    readNumberProperty(properties.mPendingPotential);

  // Somersloop / production shard count. The save format has been
  // through several renames across U1.0 / U1.1 builds; try them all.
  const somersloops =
    readNumberProperty(properties.mProductionShardCount) ??
    readNumberProperty(properties.mAddedSomersloops) ??
    readNumberProperty(properties.mNumOccupiedAlienOrgan);

  // Selected recipe — `mCurrentRecipe` is the canonical
  // `FGBuildableManufacturer` field, but a few save versions / mods
  // expose it as `mCurrentRecipeRef`.
  const recipeRef =
    readObjectPathName(properties.mCurrentRecipe) ??
    readObjectPathName(properties.mCurrentRecipeRef);

  // Resource node id — `mExtractableResource` is set on miners, oil
  // pumps, fracking extractors and water pumps. The popover uses it
  // (with the static `WorldResourceNodesById` lookup) to render the
  // "extracts: …" line.
  const extractRef = readObjectPathName(properties.mExtractableResource);

  const overclock = potential ?? Number.NaN;
  const somersloop = somersloops != null ? somersloops | 0 : 0;
  let recipe = '';
  if (recipeRef) {
    const tail = recipeRef.split('.').pop();
    if (tail) recipe = tail;
  }
  let extractedNode = '';
  if (extractRef) {
    const tail = extractRef.split('.').pop();
    if (tail) extractedNode = tail;
  }

  if (
    Number.isNaN(overclock) &&
    somersloop === 0 &&
    recipe === '' &&
    extractedNode === ''
  ) {
    return null;
  }
  return { overclock, somersloop, recipe, extractedNode };
}
/**
 * Match a entity that was specifically created to store extra data that
 * is affiliated with other buildings so that it can be displayed on the map
 * @returns If a entity was ingested properly, in which case {@link ingestEntity} can end early
 */
function matchInfoEntity(
  additionalDetailsAcc: AdditionalDetailsAccumulator,
  obj: SaveEntityLike,
  typePath: string,
  instanceName: string,
): boolean {
  try {
    switch (typePath) {
      case '/Script/FactoryGame.FGTrainStationIdentifier':
        additionalDetailsAcc.bTrainStationIds.set(instanceName, {
          type: 'TrainStationId',
          instanceName: instanceName,
          name: readObjectValueProperty(obj.properties?.mStationName) ?? '',
          stationInstanceName:
            readObjectPathName(obj.properties?.mStation) ?? '',
        });
        return true;

      case '/Game/FactoryGame/Buildable/Vehicle/Train/-Shared/BP_Train.BP_Train_C':
        additionalDetailsAcc.bTrainDetails.push({
          type: 'Train',
          name: readObjectValueProperty(obj.properties?.mTrainName) ?? '',
          timetableInstanceName:
            readObjectPathName(obj.properties?.TimeTable) ?? '',
          timetable: null,
          trainId1: readObjectPathName(obj.properties?.FirstVehicle) ?? '',
          trainId2: readObjectPathName(obj.properties?.LastVehicle) ?? '',
        });
        return true;

      case '/Script/FactoryGame.FGRailroadTimeTable': {
        const props = obj.properties as {
          mCurrentStop?: {
            value: number;
          };
          mStops: {
            values: {
              properties: {
                Station: {
                  value: {
                    pathName: string;
                  };
                };
              };
            }[];
          };
        };

        additionalDetailsAcc.bTrainTimetables.set(instanceName, {
          type: 'TrainTimetable',
          instanceName: instanceName,
          currentStop: props.mCurrentStop?.value ?? -1,
          stops:
            props.mStops.values.map(stop => {
              return {
                stationId: stop.properties.Station.value.pathName,
                stationData: null,
              };
            }) ?? [],
        });
        return true;
      }
      default:
        return false;
    }
  } catch (e: any) {
    if (e instanceof TypeError) {
      logger.warn(
        "The following object's typePath matched a decoder, but it failed to decode properly (possibly due to malformed data):",
        obj,
        e,
      );
    }
    return false;
  }
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
  additionalDetailsAcc: AdditionalDetailsAccumulator,
  rawObj: unknown,
): void {
  const obj = rawObj as SaveEntityLike;
  if (obj.type !== 'SaveEntity') return;
  const typePath = obj.typePath;
  if (typeof typePath !== 'string') return;
  const instanceName = obj.instanceName;
  if (typeof instanceName !== 'string') return;

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
          pushBuilding(acc, groupTypePath, instanceName, itx, ity, itz, iyaw);
        }
      }
    }
    return;
  }

  const didIngestEntity = matchInfoEntity(
    additionalDetailsAcc,
    obj,
    typePath,
    instanceName,
  );

  if (didIngestEntity) return;
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
    const points = readSplineLocations(obj.properties, cls.splineProperty);
    if (points) {
      const bucket = getOrCreateBucket(acc, cls.kind, cls.tier);
      const built = buildRotatedPolyline(tx, ty, yaw, points);
      bucket.polylines.push(built.flat);
      bucket.tangents.push(built.tangents);
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
        const built = buildAbsolutePolyline(wire);
        bucket.polylines.push(built.flat);
        bucket.tangents.push(built.tangents);
        acc.splineCounts.power++;
      }
      return;
    }
    // No wire data: render as building marker so it isn't lost.
  }

  // Production-machine bookkeeping (overclock / somersloop / recipe).
  // Lightweight-subsystem instances (foundations, walls, decor, …) are
  // bare transforms with no `properties` bag, so they never surface
  // these — `readMachineDetails(undefined)` returns null and
  // pushBuilding falls back to the defaults.
  const machine = readMachineDetails(obj.properties);
  pushBuilding(acc, typePath, instanceName, tx, ty, tz, yaw, machine);
}

function linkAdditionalDetails(
  acc: InfrastructureAccumulator,
  additionalDetailsAcc: AdditionalDetailsAccumulator,
): AdditionalBuildingDetails[] {
  const additionalDetailsSorted: AdditionalBuildingDetails[] = [];

  additionalDetailsAcc.bTrainTimetables.forEach(timetable => {
    timetable.stops.forEach((station, stationIndex) => {
      timetable.stops[stationIndex].stationData =
        additionalDetailsAcc.bTrainStationIds.get(station.stationId) ?? null;
    });
  });

  // The first time around, the station object is built, then it can be matched to the right index
  const stationIndicies: number[] = [];
  const trainStations: Map<string, TrainStation> = new Map();

  acc.bInstanceNames.forEach((infraInstanceName, i) => {
    switch (acc.bTypePaths[i]) {
      case '/Game/FactoryGame/Buildable/Vehicle/Train/Locomotive/BP_Locomotive.BP_Locomotive_C': {
        const trainId = additionalDetailsAcc.bTrainDetails.findIndex(
          details => {
            return (
              infraInstanceName == details.trainId1 ||
              infraInstanceName == details.trainId2
            );
          },
        );
        if (trainId !== -1) {
          const train = additionalDetailsAcc.bTrainDetails[trainId];
          const timetable = additionalDetailsAcc.bTrainTimetables.get(
            train.timetableInstanceName,
          );
          if (timetable) {
            train.timetable = timetable;
            train.timetable.stops.forEach(stop => {
              if (!stop.stationData) return;
              const trainStation =
                trainStations.get(stop.stationData.stationInstanceName) ??
                ({
                  type: 'TrainStation',
                  name: stop.stationData?.name,
                  trains: [],
                } as TrainStation);

              if (
                trainStation.trains.find(
                  otherTrain => otherTrain.trainId === trainId,
                )
              ) {
                return;
              }

              trainStation.trains.push({
                name: train.name,
                locomotiveInstanceName: infraInstanceName,
                trainId: trainId,
              });
              trainStations.set(
                stop.stationData.stationInstanceName,
                trainStation,
              );
            });
          }
          additionalDetailsSorted.push(train);
          return;
        }
        break;
      }
      case '/Game/FactoryGame/Buildable/Factory/Train/Station/Build_TrainStation.Build_TrainStation_C':
        stationIndicies.push(i);
    }
    additionalDetailsSorted.push(null);
  });

  stationIndicies.forEach(index => {
    const station = trainStations.get(acc.bInstanceNames[index]);
    if (!station) return;
    additionalDetailsSorted[index] = station;
  });

  return additionalDetailsSorted;
}

/**
 * Converts the JS-array accumulators into the flat typed-array layout
 * the canvas layer renders directly. Splits the spline buckets into
 * one block per (kind, tier) pair with a CSR offset index.
 */
export function finalizeInfrastructure(
  acc: InfrastructureAccumulator,
  additionalDetailsAcc: AdditionalDetailsAccumulator,
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

  const additionalDetails: AdditionalBuildingDetails[] = linkAdditionalDetails(
    acc,
    additionalDetailsAcc,
  );

  const buildings: InfrastructureBuildingsBlock = {
    count,
    categories: Uint8Array.from(acc.bCategories),
    positionsXY,
    positionsZ: Float32Array.from(acc.bPositionsZ),
    yaw: Float32Array.from(acc.bYaws),
    sizeWL,
    heights: Float32Array.from(acc.bHeights),
    typePaths: acc.bTypePaths,
    overclocks: Float32Array.from(acc.bOverclocks),
    somersloops: Uint8Array.from(acc.bSomersloops),
    recipes: acc.bRecipes,
    extractedNodes: acc.bExtractedNodes,
    additionalDetails: additionalDetails,
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
    // A bucket is homogeneous: all polylines either come with Hermite
    // tangents (mSplineData) or none do (power-line wires). Probing the
    // first entry is enough.
    const hasTangents = polylineCount > 0 && bucket.tangents[0] != null;
    const tangentsXY = hasTangents ? new Float32Array(totalPoints * 4) : null;
    let cursor = 0;
    for (let i = 0; i < polylineCount; i++) {
      const flat = bucket.polylines[i];
      pointsXY.set(flat, cursor);
      if (tangentsXY) {
        const t = bucket.tangents[i];
        if (t) tangentsXY.set(t, cursor * 2);
      }
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
      tangentsXY,
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
  const additionalDetailsAcc = createAdditionalDetailsAccumulator();
  for (const level of Object.values(save.levels)) {
    for (const obj of level.objects) {
      ingestEntity(acc, additionalDetailsAcc, obj);
    }
  }
  return finalizeInfrastructure(acc, additionalDetailsAcc);
}
