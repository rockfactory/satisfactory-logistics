import type {
  ObjectArrayProperty,
  ObjectProperty,
  SatisfactorySave,
} from '@etothepii/satisfactory-file-parser';
import type { Vec3 } from './infrastructure/types';

/**
 * Full Unreal typePath strings for every placeable extractor we
 * translate into a "used node" mark. Checked against
 * `SaveEntity.typePath`. Water pumps are intentionally excluded:
 * their `mExtractableResource` points at `FGWaterVolume_*` actors
 * rather than a `BP_ResourceNode_*`, so the id does not line up with
 * anything in our `WorldResourceNodes.json` dataset.
 *
 * Miner tiers are matched by regex at the last segment of the
 * typePath (see {@link MINER_LAST_SEGMENT_RE}), so a hypothetical
 * future Mk4 will be picked up without a code change. The
 * non-miner extractors are listed explicitly since their naming is
 * one-offs.
 */
const EXPLICIT_EXTRACTOR_TYPE_PATHS = new Set<string>([
  '/Game/FactoryGame/Buildable/Factory/OilPump/Build_OilPump.Build_OilPump_C',
  '/Game/FactoryGame/Buildable/Factory/FrackingExtractor/Build_FrackingExtractor.Build_FrackingExtractor_C',
]);

/** Matches `Build_MinerMk1_C`, `Build_MinerMk2_C`, ... on the last segment. */
const MINER_LAST_SEGMENT_RE = /^Build_MinerMk\d+_C$/;

const RECIPE_MANAGER_TYPEPATH = '/Script/FactoryGame.FGRecipeManager';

const PLAYER_TYPEPATH =
  '/Game/FactoryGame/Character/Player/Char_Player.Char_Player_C';

function isExtractorTypePath(typePath: string): boolean {
  if (EXPLICIT_EXTRACTOR_TYPE_PATHS.has(typePath)) return true;
  const lastSegment = typePath.split('.').pop();
  return lastSegment != null && MINER_LAST_SEGMENT_RE.test(lastSegment);
}

interface SaveObjectLike {
  typePath?: unknown;
  properties?: Record<string, unknown>;
  transform?: {
    translation?: Partial<Vec3>;
  };
}

/**
 * Mutable state passed across {@link inspectObject} calls during a
 * streaming parse. The worker creates one of these via
 * {@link createInspectAccumulator}, feeds each save object from the
 * JSON stream into {@link inspectObject}, then turns the final state
 * into the flat shape returned by {@link finalizeInspect}.
 */
export interface InspectAccumulator {
  availableRecipes: Set<string>;
  usedNodeIds: Set<string>;
  /**
   * World-cm positions of every `Char_Player_C` actor seen in the
   * stream. Plain array (not a Set) so the relative order matches the
   * save's level objects: the host's pawn is typically first, which
   * gives the camera a deterministic centering target.
   */
  players: Vec3[];
}

export function createInspectAccumulator(): InspectAccumulator {
  return {
    availableRecipes: new Set(),
    usedNodeIds: new Set(),
    players: [],
  };
}

/**
 * Pulls the two pieces of game state we want from a single save
 * object: the recipe-manager's `mAvailableRecipes` (one object per
 * save) and the `mExtractableResource` reference of every miner /
 * oil pump / fracking extractor (one per node). Mutates the
 * accumulator in place. Safe to call on any object shape; non-
 * matching objects are silently skipped.
 */
export function inspectObject(acc: InspectAccumulator, rawObj: unknown): void {
  const obj = rawObj as SaveObjectLike;
  if (typeof obj.typePath !== 'string') return;

  if (obj.typePath === PLAYER_TYPEPATH) {
    const t = obj.transform?.translation;
    if (
      t &&
      typeof t.x === 'number' &&
      typeof t.y === 'number' &&
      typeof t.z === 'number' &&
      Number.isFinite(t.x) &&
      Number.isFinite(t.y) &&
      Number.isFinite(t.z)
    ) {
      acc.players.push({ x: t.x, y: t.y, z: t.z });
    }
    return;
  }

  if (obj.typePath === RECIPE_MANAGER_TYPEPATH) {
    const prop = obj.properties?.mAvailableRecipes as
      | ObjectArrayProperty
      | undefined;
    const values = prop?.values;
    if (Array.isArray(values)) {
      for (const v of values) {
        const id = v?.pathName?.split('.')[1];
        if (id) acc.availableRecipes.add(id);
      }
    }
    return;
  }

  if (!isExtractorTypePath(obj.typePath)) return;
  const ref = obj.properties?.mExtractableResource as
    | ObjectProperty
    | undefined;
  const pathName = ref?.value?.pathName;
  if (!pathName) return;
  const nodeId = pathName.split('.').pop();
  if (nodeId) acc.usedNodeIds.add(nodeId);
}

export interface InspectSummary {
  availableRecipes: string[];
  usedNodeIds: string[];
  players: Vec3[];
}

export function finalizeInspect(acc: InspectAccumulator): InspectSummary {
  return {
    availableRecipes: [...acc.availableRecipes],
    usedNodeIds: [...acc.usedNodeIds],
    players: acc.players.slice(),
  };
}

/**
 * Thin wrapper around the streaming-friendly accumulator API used
 * for tests and the eager-parse fallback: walks every object in the
 * fully-parsed save and returns the inspected snapshot.
 */
export function inspectSavegame(save: SatisfactorySave): InspectSummary {
  const acc = createInspectAccumulator();
  for (const level of Object.values(save.levels)) {
    for (const obj of level.objects) {
      inspectObject(acc, obj);
    }
  }
  return finalizeInspect(acc);
}
