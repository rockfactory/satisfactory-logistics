import fs from 'node:fs';
import path from 'node:path';
import sortBy from 'lodash/sortBy';
import type {
  Purity,
  WorldResourceNodeType,
} from '../../src/recipes/WorldResourceNodes';

/**
 * Extracts world resource node placements from a FModel JSON dump of
 * `Persistent_Level.umap`.
 *
 * The dump is a flat array of every actor and component packed into the
 * map's persistent level. Resource nodes themselves carry the resource
 * class and purity, but their world position lives on a child component
 * (the `RootComponent`), so this parser does a two-pass match: first
 * collect every node-shaped actor by its full UE reference, then walk
 * the components and copy each actor's transform from the matching
 * `RootComponent`.
 *
 * Run via `npm run extract-world-nodes` (entry point in
 * `scripts/extractWorldNodes.ts`).
 */

interface ObjectRef {
  ObjectName?: string;
  ObjectPath?: string;
}

interface UnrealVector {
  X?: number;
  Y?: number;
  Z?: number;
}

interface UnrealRotator {
  Pitch?: number;
  Yaw?: number;
  Roll?: number;
}

interface UnrealEntry {
  Type?: string;
  Name?: string;
  Outer?: ObjectRef;
  Properties?: {
    mResourceClass?: ObjectRef;
    mOverrideResourceClass?: ObjectRef;
    mPurity?: string;
    mResourcesLeft?: number;
    mCore?: ObjectRef;
    RootComponent?: ObjectRef;
    RelativeLocation?: UnrealVector;
    RelativeRotation?: UnrealRotator;
    [key: string]: unknown;
  };
}

interface RawNodeOutput {
  id: string;
  resource: string;
  purity: Purity;
  classPath: string;
  nodeType: WorldResourceNodeType;
  displayName?: string;
  x: number;
  y: number;
  z: number;
  rotation?: number;
}

const NODE_ACTOR_TYPES: Record<string, WorldResourceNodeType> = {
  BP_ResourceNode_C: 'node',
  BP_ResourceDeposit_C: 'deposit',
  BP_FrackingCore_C: 'frackingCore',
  BP_FrackingSatellite_C: 'frackingSatellite',
  BP_ResourceNodeGeyser_C: 'geyser',
};

/**
 * Geysers spawn no `mResourceClass` because the actor *is* the
 * resource — they're geothermal generator anchors. The current item DB
 * doesn't expose geothermal energy as a `Desc_*_C`, so we tag them with
 * a synthetic id; the renderer can decide whether to show them.
 */
const GEYSER_RESOURCE_ID = 'Desc_GeothermalEnergy_C';

/**
 * Map FModel's UE `EResourcePurity` enum to our app's lowercase token.
 * Note `RP_Inpure` — that's the in-game spelling and not a typo on our
 * side. UE serialises unset enum-by-value properties by omitting them
 * entirely, and the in-game default for resource nodes is `Normal`, so
 * a missing `mPurity` means a normal-purity node.
 */
const PURITY_MAP: Record<string, Purity> = {
  RP_Inpure: 'impure',
  RP_Impure: 'impure',
  RP_Normal: 'normal',
  RP_Pure: 'pure',
};

interface FactoryItem {
  id: string;
  displayName?: string;
  name?: string;
}

export interface ParseWorldNodesOptions {
  inputPath: string;
  outputPath: string;
  itemsPath?: string;
  dryRun?: boolean;
  /** Print one line per emitted node (very chatty, debug only). */
  verbose?: boolean;
}

export interface ParseWorldNodesResult {
  emitted: number;
  skipped: { reason: string; id: string }[];
  byType: Record<WorldResourceNodeType, number>;
  byResource: Record<string, number>;
  added: string[];
  removed: string[];
}

export function parseWorldNodes(
  options: ParseWorldNodesOptions,
): ParseWorldNodesResult {
  const {
    inputPath,
    outputPath,
    itemsPath = path.resolve('src/recipes/FactoryItems.json'),
    dryRun = false,
    verbose = false,
  } = options;

  const absInput = path.resolve(inputPath);
  if (!fs.existsSync(absInput)) {
    throw new Error(`Persistent_Level export not found at ${absInput}`);
  }

  log(`Reading ${absInput}…`);
  const raw = fs.readFileSync(absInput, 'utf8');
  log(`Parsing ${(raw.length / 1_000_000).toFixed(1)}MB of JSON…`);
  const entries = JSON.parse(raw) as UnrealEntry[];
  log(`  -> ${entries.length.toLocaleString()} entries`);

  const items = loadItemIndex(itemsPath);

  // ---- Pass 1: collect node-shaped actors --------------------------------
  // Keyed by the actor's typed UE reference (e.g.
  // `BP_ResourceNode_C'Persistent_Level:PersistentLevel.BP_ResourceNode100'`)
  // because that's exactly what child components store in their
  // `Outer.ObjectName`.
  interface ActorMeta {
    name: string;
    nodeType: WorldResourceNodeType;
    resource: string;
    purity: Purity;
    classPath: string;
    rootComponentRef?: string;
    skipReason?: string;
  }

  const actorsByRef = new Map<string, ActorMeta>();
  let nodeActorTotal = 0;
  const skipped: { reason: string; id: string }[] = [];
  const unknownResources = new Set<string>();

  for (const entry of entries) {
    const type = entry.Type;
    if (!type || !(type in NODE_ACTOR_TYPES)) continue;
    nodeActorTotal++;

    const name = entry.Name;
    if (!name) {
      skipped.push({ reason: 'missing-name', id: type });
      continue;
    }

    const nodeType = NODE_ACTOR_TYPES[type];
    const props = entry.Properties ?? {};

    let resource: string | undefined;
    if (nodeType === 'geyser') {
      resource = GEYSER_RESOURCE_ID;
    } else {
      const resRef =
        nodeType === 'deposit'
          ? props.mOverrideResourceClass
          : props.mResourceClass;
      resource = parseObjectRefId(resRef);
    }

    if (!resource) {
      skipped.push({ reason: 'missing-resource', id: name });
      continue;
    }

    if (
      nodeType !== 'geyser' &&
      items.size > 0 &&
      !items.has(resource)
    ) {
      // Don't skip — modded resources may appear here legitimately.
      // Just warn so the maintainer can decide whether to extend the
      // item DB before committing.
      unknownResources.add(resource);
    }

    const purity = parsePurity(props.mPurity, nodeType);
    const classPath = parseClassFromActor(entry) ?? `${type}`;
    const rootComponentRef = props.RootComponent?.ObjectName;

    const actorRef = `${type}'Persistent_Level:PersistentLevel.${name}'`;
    actorsByRef.set(actorRef, {
      name,
      nodeType,
      resource,
      purity,
      classPath,
      rootComponentRef,
    });
  }

  log(
    `Pass 1: ${nodeActorTotal.toLocaleString()} candidate node actors -> ` +
      `${actorsByRef.size.toLocaleString()} kept (${skipped.length} skipped)`,
  );

  // ---- Pass 2: bind each actor to its RootComponent transform ------------
  // Components may appear *before* their owning actor in the dump (the
  // file isn't ordered), so a single linear pass after pass 1 is safe.
  interface Transform {
    x: number;
    y: number;
    z: number;
    yaw?: number;
  }

  const transformsByActor = new Map<string, Transform>();
  let componentMatches = 0;

  for (const entry of entries) {
    const type = entry.Type;
    if (
      type !== 'BoxComponent' &&
      type !== 'SceneComponent' &&
      type !== 'StaticMeshComponent'
    ) {
      continue;
    }
    const ownerRef = entry.Outer?.ObjectName;
    if (!ownerRef) continue;
    const actor = actorsByRef.get(ownerRef);
    if (!actor) continue;

    // Only the component the actor calls its `RootComponent` carries
    // the world transform we want; ignore decals / particle systems /
    // other auxiliary children.
    if (actor.rootComponentRef) {
      const componentName = entry.Name;
      const expected = actor.rootComponentRef;
      // expected looks like `BoxComponent'…BP_ResourceNode100.BoxComponent_0'`
      // — match on the suffix after the last dot.
      const expectedSuffix = expected.split('.').pop()?.replace(/'$/, '');
      if (expectedSuffix && componentName !== expectedSuffix) continue;
    }

    const loc = entry.Properties?.RelativeLocation;
    if (!loc || loc.X == null || loc.Y == null) continue;

    transformsByActor.set(ownerRef, {
      x: Math.round(loc.X),
      y: Math.round(loc.Y),
      z: Math.round(loc.Z ?? 0),
      yaw:
        entry.Properties?.RelativeRotation?.Yaw != null
          ? round2(entry.Properties.RelativeRotation.Yaw)
          : undefined,
    });
    componentMatches++;
  }

  log(`Pass 2: ${componentMatches.toLocaleString()} component matches`);

  // ---- Build output ------------------------------------------------------
  const byType: Record<WorldResourceNodeType, number> = {
    node: 0,
    deposit: 0,
    frackingCore: 0,
    frackingSatellite: 0,
    geyser: 0,
  };
  const byResource: Record<string, number> = {};
  const output: RawNodeOutput[] = [];

  for (const [actorRef, actor] of actorsByRef) {
    const xform = transformsByActor.get(actorRef);
    if (!xform) {
      skipped.push({ reason: 'missing-transform', id: actor.name });
      continue;
    }

    const displayName = items.get(actor.resource)?.displayName;
    output.push({
      id: actor.name,
      resource: actor.resource,
      purity: actor.purity,
      classPath: actor.classPath,
      nodeType: actor.nodeType,
      displayName,
      x: xform.x,
      y: xform.y,
      z: xform.z,
      rotation: xform.yaw,
    });
    byType[actor.nodeType]++;
    byResource[actor.resource] = (byResource[actor.resource] ?? 0) + 1;

    if (verbose) {
      log(
        `  + ${actor.name} ${actor.resource} ${actor.purity} ` +
          `(${xform.x}, ${xform.y}, ${xform.z})`,
      );
    }
  }

  const sorted = sortBy(output, ['nodeType', 'resource', 'id']);

  // ---- Diff vs current bundled file --------------------------------------
  const previousIds = readPreviousIds(outputPath);
  const currentIds = new Set(sorted.map(n => n.id));
  const added = [...currentIds].filter(id => !previousIds.has(id));
  const removed = [...previousIds].filter(id => !currentIds.has(id));

  // ---- Write -------------------------------------------------------------
  if (!dryRun) {
    fs.writeFileSync(outputPath, formatJson(sorted));
    log(`Wrote ${sorted.length.toLocaleString()} nodes to ${outputPath}`);
  } else {
    log('(dry-run) skipping write');
  }

  if (unknownResources.size > 0) {
    log(
      `WARN: ${unknownResources.size} resource class(es) not in FactoryItems.json: ` +
        [...unknownResources].sort().join(', '),
    );
  }

  return {
    emitted: sorted.length,
    skipped,
    byType,
    byResource,
    added,
    removed,
  };
}

/* ---------------- helpers ---------------- */

function parseObjectRefId(ref: ObjectRef | undefined): string | undefined {
  // `BlueprintGeneratedClass'Desc_OreIron_C'` -> `Desc_OreIron_C`
  const name = ref?.ObjectName;
  if (!name) return undefined;
  const m = name.match(/'([^']+)'/);
  return m?.[1];
}

function parseClassFromActor(entry: UnrealEntry): string | undefined {
  // The actor entry has a top-level `Class` like
  // `BlueprintGeneratedClass'/Game/FactoryGame/Resource/BP_ResourceNode.BP_ResourceNode_C'`.
  // We expose the suffix (`BP_ResourceNode_C`) since that's what
  // savegame-side parsers also see.
  const cls = (entry as unknown as { Class?: string }).Class;
  if (!cls) return undefined;
  const m = cls.match(/\.([^.']+)'$/);
  return m?.[1] ?? entry.Type;
}

function parsePurity(
  raw: string | undefined,
  nodeType: WorldResourceNodeType,
): Purity {
  if (!raw) {
    // Deposits don't have purity in-game; treat as normal so the
    // enum-driven UI doesn't choke.
    return 'normal';
  }
  const stripped = raw.replace(/^EResourcePurity::/, '');
  const mapped = PURITY_MAP[stripped];
  if (!mapped) {
    log(
      `WARN: unknown purity "${raw}" for ${nodeType}, defaulting to normal`,
    );
    return 'normal';
  }
  return mapped;
}

function loadItemIndex(itemsPath: string): Map<string, FactoryItem> {
  if (!fs.existsSync(itemsPath)) {
    log(`(no FactoryItems.json at ${itemsPath}; skipping resource validation)`);
    return new Map();
  }
  const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8')) as FactoryItem[];
  const map = new Map<string, FactoryItem>();
  for (const item of items) map.set(item.id, item);
  return map;
}

function readPreviousIds(outputPath: string): Set<string> {
  if (!fs.existsSync(outputPath)) return new Set();
  try {
    const raw = JSON.parse(fs.readFileSync(outputPath, 'utf8')) as {
      id: string;
    }[];
    return new Set(raw.map(n => n.id));
  } catch (err) {
    log(`WARN: could not read existing ${outputPath}: ${(err as Error).message}`);
    return new Set();
  }
}

function formatJson(value: unknown): string {
  // Match the existing file's 2-space, trailing-newline style.
  return `${JSON.stringify(value, null, 2)}\n`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function log(msg: string): void {
  console.log(msg);
}
