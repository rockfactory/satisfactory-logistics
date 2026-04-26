import type {
  ObjectArrayProperty,
  ObjectProperty,
  SatisfactorySave,
} from '@etothepii/satisfactory-file-parser';
import type { Vec3 } from './infrastructure/types';
import type { SavegameNodeOverride } from './ParseSavegameMessages';

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

/**
 * Resource-actor classes that can carry per-instance randomization
 * overrides (`mResourceClassOverride` and, on satellites only,
 * `mPurityOverride`). Cores are included so the lookup table stays
 * complete even though the map layer hides them — having the override
 * data already in the store is cheap and means we don't need a second
 * pass if a future feature opts cores back in.
 */
const RANDOMIZABLE_NODE_TYPEPATHS = new Set<string>([
  '/Game/FactoryGame/Resource/BP_ResourceNode.BP_ResourceNode_C',
  '/Game/FactoryGame/Resource/BP_FrackingSatellite.BP_FrackingSatellite_C',
  '/Game/FactoryGame/Resource/BP_FrackingCore.BP_FrackingCore_C',
]);

/**
 * Pickup-style classes whose mere presence in the save signals the
 * collectible has not yet been picked up. Once the player collects
 * the pickup, the actor is removed from the save entirely — we
 * derive "collected" by diffing this set against the static
 * `WorldCollectibles` dataset in the games slice.
 */
const COLLECTIBLE_TYPEPATHS = new Set<string>([
  '/Game/FactoryGame/Resource/Environment/Crystal/BP_Crystal.BP_Crystal_C',
  '/Game/FactoryGame/Resource/Environment/Crystal/BP_Crystal_mk2.BP_Crystal_mk2_C',
  '/Game/FactoryGame/Resource/Environment/Crystal/BP_Crystal_mk3.BP_Crystal_mk3_C',
  '/Game/FactoryGame/Prototype/WAT/BP_WAT1.BP_WAT1_C',
  '/Game/FactoryGame/Prototype/WAT/BP_WAT2.BP_WAT2_C',
]);

/**
 * Maps the in-save `EResourcePurity` enum strings to the project's
 * lowercase `Purity` strings. Keeps the **`RP_Inpure`** typo from the
 * game format explicit so a vendored renaming would surface as a test
 * failure rather than silently dropping the entry on the floor.
 */
const PURITY_FROM_SAVE: Record<string, 'impure' | 'normal' | 'pure'> = {
  RP_Inpure: 'impure',
  RP_Normal: 'normal',
  RP_Pure: 'pure',
};

function isExtractorTypePath(typePath: string): boolean {
  if (EXPLICIT_EXTRACTOR_TYPE_PATHS.has(typePath)) return true;
  const lastSegment = typePath.split('.').pop();
  return lastSegment != null && MINER_LAST_SEGMENT_RE.test(lastSegment);
}

interface PurityProperty {
  value?: { value?: unknown };
}

function readPurityOverride(
  prop: PurityProperty | undefined,
): 'impure' | 'normal' | 'pure' | undefined {
  const enumValue = prop?.value?.value;
  if (typeof enumValue !== 'string') return undefined;
  return PURITY_FROM_SAVE[enumValue];
}

function readResourceOverride(
  prop: ObjectProperty | undefined,
): string | undefined {
  const pathName = prop?.value?.pathName;
  if (typeof pathName !== 'string' || pathName.length === 0) return undefined;
  const tail = pathName.split('.').pop();
  return tail && tail.length > 0 ? tail : undefined;
}

function instanceTail(instanceName: unknown): string | undefined {
  if (typeof instanceName !== 'string') return undefined;
  const tail = instanceName.split('.').pop();
  return tail && tail.length > 0 ? tail : undefined;
}

interface SaveObjectLike {
  typePath?: unknown;
  instanceName?: unknown;
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
  /**
   * Per-node randomization overrides keyed by the actor's tail
   * `instanceName`. Map (not array) so a duplicate object in the
   * stream — possible when a sublevel is replayed during streaming
   * — last-write-wins instead of producing two conflicting entries.
   */
  nodeOverrides: Map<string, SavegameNodeOverride>;
  /**
   * Tail `instanceName`s for every uncollected pickup actor we saw
   * (slugs / Mercer spheres / somersloops). The downstream slice
   * action diffs this set against the bundled `WorldCollectibles`
   * dataset to derive the "collected" complement.
   */
  presentCollectibleIds: Set<string>;
}

export function createInspectAccumulator(): InspectAccumulator {
  return {
    availableRecipes: new Set(),
    usedNodeIds: new Set(),
    players: [],
    nodeOverrides: new Map(),
    presentCollectibleIds: new Set(),
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

  if (RANDOMIZABLE_NODE_TYPEPATHS.has(obj.typePath)) {
    const id = instanceTail(obj.instanceName);
    if (!id) return;
    const props = obj.properties ?? {};
    const resource = readResourceOverride(
      props.mResourceClassOverride as ObjectProperty | undefined,
    );
    const purity = readPurityOverride(
      props.mPurityOverride as PurityProperty | undefined,
    );
    if (!resource && !purity) return;
    // Resource is the load-bearing field — every override we apply needs
    // it. A bare purity-only override (theoretical: a future patch could
    // drop the resource property) is dropped here rather than written
    // partially: the consumer uses spread-merge on the static node, so
    // an entry without `resource` would just be a no-op anyway.
    if (!resource) return;
    acc.nodeOverrides.set(id, { id, resource, ...(purity && { purity }) });
    return;
  }

  if (COLLECTIBLE_TYPEPATHS.has(obj.typePath)) {
    const id = instanceTail(obj.instanceName);
    if (id) acc.presentCollectibleIds.add(id);
    return;
  }

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
  nodeOverrides: SavegameNodeOverride[];
  presentCollectibleIds: string[];
}

export function finalizeInspect(acc: InspectAccumulator): InspectSummary {
  return {
    availableRecipes: [...acc.availableRecipes],
    usedNodeIds: [...acc.usedNodeIds],
    players: acc.players.slice(),
    nodeOverrides: [...acc.nodeOverrides.values()],
    presentCollectibleIds: [...acc.presentCollectibleIds],
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
