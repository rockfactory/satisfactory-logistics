import fs from 'node:fs';
import path from 'node:path';
import sortBy from 'lodash/sortBy';
import type {
  CollectibleType,
  DropPodUnlockCost,
} from '../../src/recipes/WorldCollectibles';

/**
 * Extracts pickup-style world entities (power slugs, somersloops,
 * mercer spheres, hard-drive drop pods, audio tapes, customization
 * unlocks) from a FModel JSON dump of `Persistent_Level.umap` together
 * with its `__ExternalActors__` companion folder.
 *
 * Where the data lives:
 *
 * - `data/Persistent_Level.json` is the main level dump. In Satisfactory
 *   1.0 (UE5 World Partition), only a small subset of pickups was
 *   authored in the persistent level itself: most notably the 29
 *   pre-World-Partition `BP_DropPod_C` actors and 3 `BP_TapePickup_C`
 *   actors.
 * - `data/Persistent_Level/_Generated_/*.json` is the per-actor "external
 *   actor" dump (one file per actor, ~4,200 files for the vanilla map)
 *   exported separately from FModel under
 *   `Persistent_Level/__ExternalActors__/`. Power slugs, somersloops,
 *   mercer spheres, the bulk of drop pods, and the lone customization
 *   unlock all live here.
 *
 * This parser walks both sources, applies the same actor-shape →
 * collectible-type mapping, and emits one combined dataset. The matching
 * algorithm (actor → its `RootComponent`'s `RelativeLocation`) is the
 * same two-pass technique used by `parseWorldNodes.ts`, just applied
 * file-by-file because each external-actor file is self-contained
 * (component and actor live in the same JSON).
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

interface DropPodCost {
  CostType?: string;
  ItemCost?: {
    ItemClass?: ObjectRef;
    Amount?: number;
  };
}

interface UnrealEntry {
  Type?: string;
  Name?: string;
  Class?: string;
  Outer?: ObjectRef;
  Properties?: {
    RootComponent?: ObjectRef;
    RelativeLocation?: UnrealVector;
    RelativeRotation?: UnrealRotator;
    mItemPickupGuid?: string;
    mDropPodGuid?: string;
    mUnlockCost?: DropPodCost;
    mSchematic?: ObjectRef;
    [key: string]: unknown;
  };
}

interface RawCollectibleOutput {
  id: string;
  type: CollectibleType;
  classPath?: string;
  pickupGuid?: string;
  x: number;
  y: number;
  z: number;
  rotation?: number;
  unlockCost?: DropPodUnlockCost[];
  schematicId?: string;
}

/**
 * Maps actor `Type` (e.g. `BP_Crystal_C`) to our internal
 * {@link CollectibleType} discriminator. Only types listed here are
 * extracted; everything else (resource nodes, plant life, debris,
 * spawners, water…) is silently ignored.
 *
 * `BP_Crystal_C` is the Mk1 (blue) slug — the variant suffix is empty
 * to match the actor's class name.
 */
const COLLECTIBLE_ACTOR_TYPES: Record<string, CollectibleType> = {
  BP_Crystal_C: 'slugMk1',
  BP_Crystal_mk2_C: 'slugMk2',
  BP_Crystal_mk3_C: 'slugMk3',
  BP_WAT1_C: 'somersloop',
  BP_WAT2_C: 'mercerSphere',
  BP_DropPod_C: 'hardDrive',
  BP_TapePickup_C: 'audioTape',
  BP_UnlockPickup_Customization_C: 'customizationUnlock',
};

export interface ParseWorldCollectiblesOptions {
  /** `data/Persistent_Level.json` (main dump). */
  persistentLevelPath: string;
  /**
   * `data/Persistent_Level/_Generated_/` (FModel `__ExternalActors__`
   * export, one file per actor). Optional: when missing the parser
   * still emits the few collectibles authored in the persistent level
   * itself (29 drop pods + 3 audio tapes for vanilla 1.0).
   */
  externalActorsDir?: string;
  /** Output bundled JSON path. */
  outputPath: string;
  dryRun?: boolean;
  /** Print one line per emitted collectible (very chatty, debug only). */
  verbose?: boolean;
}

export interface ParseWorldCollectiblesResult {
  emitted: number;
  byType: Record<CollectibleType, number>;
  skipped: { reason: string; id: string }[];
  added: string[];
  removed: string[];
  /**
   * How many external-actor files were inspected. Useful for sanity-
   * checking that the maintainer pointed `--collectibles-dir` at the
   * right folder.
   */
  externalActorFiles: number;
}

export function parseWorldCollectibles(
  options: ParseWorldCollectiblesOptions,
): ParseWorldCollectiblesResult {
  const {
    persistentLevelPath,
    externalActorsDir,
    outputPath,
    dryRun = false,
    verbose = false,
  } = options;

  const byType: Record<CollectibleType, number> = {
    slugMk1: 0,
    slugMk2: 0,
    slugMk3: 0,
    somersloop: 0,
    mercerSphere: 0,
    hardDrive: 0,
    audioTape: 0,
    customizationUnlock: 0,
  };
  const skipped: { reason: string; id: string }[] = [];
  const collectibles: RawCollectibleOutput[] = [];

  // --- Source 1: Persistent_Level.json (the few pre-WP pickups) ----------
  if (fs.existsSync(persistentLevelPath)) {
    log(`Reading ${persistentLevelPath}…`);
    const raw = fs.readFileSync(persistentLevelPath, 'utf8');
    log(`Parsing ${(raw.length / 1_000_000).toFixed(1)}MB of JSON…`);
    const entries = JSON.parse(raw) as UnrealEntry[];
    log(`  -> ${entries.length.toLocaleString()} entries`);
    extractFromEntries(entries, collectibles, skipped, verbose);
  } else {
    log(`(no ${persistentLevelPath} — skipping main level dump)`);
  }

  // --- Source 2: per-actor external-actor files --------------------------
  let externalActorFiles = 0;
  if (externalActorsDir && fs.existsSync(externalActorsDir)) {
    log(`Scanning external actors in ${externalActorsDir}…`);
    const files = fs
      .readdirSync(externalActorsDir)
      .filter(name => name.endsWith('.json'))
      .map(name => path.join(externalActorsDir, name));
    externalActorFiles = files.length;
    log(`  -> ${files.length.toLocaleString()} external-actor files`);

    let processed = 0;
    for (const file of files) {
      try {
        const raw = fs.readFileSync(file, 'utf8');
        const entries = JSON.parse(raw) as UnrealEntry[];
        extractFromEntries(entries, collectibles, skipped, verbose);
      } catch (err) {
        skipped.push({
          reason: 'parse-error',
          id: `${path.basename(file)}: ${(err as Error).message}`,
        });
      }
      processed++;
      if (processed % 500 === 0) {
        log(`  …${processed.toLocaleString()} / ${files.length.toLocaleString()}`);
      }
    }
  } else if (externalActorsDir) {
    log(
      `(${externalActorsDir} not found; skipping external-actor scan — ` +
        'expect only the ~32 pre-WP collectibles)',
    );
  }

  // --- Tally + sort + diff ----------------------------------------------
  for (const c of collectibles) byType[c.type]++;

  const sorted = sortBy(collectibles, ['type', 'id']);

  const previousIds = readPreviousIds(outputPath);
  const currentIds = new Set(sorted.map(c => c.id));
  const added = [...currentIds].filter(id => !previousIds.has(id));
  const removed = [...previousIds].filter(id => !currentIds.has(id));

  // --- Write -------------------------------------------------------------
  if (!dryRun) {
    fs.writeFileSync(outputPath, formatJson(sorted));
    log(`Wrote ${sorted.length.toLocaleString()} collectibles to ${outputPath}`);
  } else {
    log('(dry-run) skipping write');
  }

  return {
    emitted: sorted.length,
    byType,
    skipped,
    added,
    removed,
    externalActorFiles,
  };
}

/**
 * Two-pass match within a single entries array (either the whole
 * persistent level or one external-actor file). Pass 1 collects
 * collectible-shaped actors keyed by their UE reference; pass 2 walks
 * the components and copies each actor's `RootComponent` transform.
 *
 * Each external-actor file is small and self-contained, so iterating
 * twice is fine (and keeps the code symmetric with how
 * `parseWorldNodes.ts` handles the persistent level).
 */
function extractFromEntries(
  entries: UnrealEntry[],
  out: RawCollectibleOutput[],
  skipped: { reason: string; id: string }[],
  verbose: boolean,
): void {
  interface ActorMeta {
    name: string;
    type: CollectibleType;
    classPath: string;
    rootComponentRef?: string;
    pickupGuid?: string;
    unlockCost?: DropPodUnlockCost[];
    schematicId?: string;
  }

  const actorsByRef = new Map<string, ActorMeta>();

  for (const entry of entries) {
    const type = entry.Type;
    if (!type || !(type in COLLECTIBLE_ACTOR_TYPES)) continue;
    const name = entry.Name;
    if (!name) {
      skipped.push({ reason: 'missing-name', id: type });
      continue;
    }

    const collectibleType = COLLECTIBLE_ACTOR_TYPES[type];
    const props = entry.Properties ?? {};
    const classPath = parseClassFromActor(entry) ?? type;

    // The `Outer` ref points at the level itself; child components
    // identify their owner with `<Type>'<Level>:PersistentLevel.<Name>'`.
    // Pre-build the same key for the actor lookup.
    const ownerScope = parseLevelScope(entry.Outer?.ObjectName) ?? 'PersistentLevel';
    const actorRef = `${type}'Persistent_Level:${ownerScope}.${name}'`;

    actorsByRef.set(actorRef, {
      name,
      type: collectibleType,
      classPath,
      rootComponentRef: props.RootComponent?.ObjectName,
      pickupGuid: pickGuid(props),
      unlockCost: parseUnlockCost(props.mUnlockCost),
      schematicId: parseObjectRefId(props.mSchematic),
    });
  }

  if (actorsByRef.size === 0) return;

  // Pass 2: bind each actor to its RootComponent transform.
  interface Transform {
    x: number;
    y: number;
    z: number;
    yaw?: number;
  }
  const transformsByActor = new Map<string, Transform>();

  for (const entry of entries) {
    const type = entry.Type;
    if (
      type !== 'BoxComponent' &&
      type !== 'SceneComponent' &&
      type !== 'StaticMeshComponent' &&
      type !== 'SphereComponent'
    ) {
      continue;
    }
    const ownerRef = entry.Outer?.ObjectName;
    if (!ownerRef) continue;
    const actor = actorsByRef.get(ownerRef);
    if (!actor) continue;

    if (actor.rootComponentRef) {
      const expectedSuffix = actor.rootComponentRef
        .split('.')
        .pop()
        ?.replace(/'$/, '');
      if (expectedSuffix && entry.Name !== expectedSuffix) continue;
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
  }

  for (const [actorRef, actor] of actorsByRef) {
    const xform = transformsByActor.get(actorRef);
    if (!xform) {
      skipped.push({ reason: 'missing-transform', id: actor.name });
      continue;
    }

    out.push({
      id: actor.name,
      type: actor.type,
      classPath: actor.classPath,
      pickupGuid: actor.pickupGuid,
      x: xform.x,
      y: xform.y,
      z: xform.z,
      rotation: xform.yaw,
      unlockCost: actor.unlockCost?.length ? actor.unlockCost : undefined,
      schematicId: actor.schematicId,
    });

    if (verbose) {
      log(
        `  + ${actor.type.padEnd(20)} ${actor.name} ` +
          `(${xform.x}, ${xform.y}, ${xform.z})`,
      );
    }
  }
}

/* ---------------- helpers ---------------- */

function parseObjectRefId(ref: ObjectRef | undefined): string | undefined {
  // `BlueprintGeneratedClass'Schematic_Huntdown_C'` -> `Schematic_Huntdown_C`
  const name = ref?.ObjectName;
  if (!name) return undefined;
  const m = name.match(/'([^']+)'/);
  return m?.[1];
}

function parseClassFromActor(entry: UnrealEntry): string | undefined {
  const cls = entry.Class;
  if (!cls) return undefined;
  const m = cls.match(/\.([^.']+)'$/);
  return m?.[1] ?? entry.Type;
}

/**
 * Pulls the `Level` segment out of an Outer ref. Most actors live in
 * `PersistentLevel`, but external-actor files may use a different
 * sublevel name — e.g.
 * `Level'Persistent_Level:PersistentLevel'`. We extract the bit
 * between `:` and the trailing quote so the actor reference we
 * synthesize matches what the components store in their `Outer`.
 */
function parseLevelScope(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const m = name.match(/:([^']+)'/);
  return m?.[1];
}

function pickGuid(
  props: NonNullable<UnrealEntry['Properties']>,
): string | undefined {
  // Pickups carry `mItemPickupGuid`; drop pods carry `mDropPodGuid`.
  // Either is a stable cross-run identity (UE persists them in the
  // savefile).
  return props.mItemPickupGuid ?? props.mDropPodGuid;
}

function parseUnlockCost(
  cost: DropPodCost | undefined,
): DropPodUnlockCost[] | undefined {
  if (!cost?.ItemCost) return undefined;
  const item = parseObjectRefId(cost.ItemCost.ItemClass);
  const amount = cost.ItemCost.Amount;
  if (!item || amount == null) return undefined;
  return [{ item, amount }];
}

function readPreviousIds(outputPath: string): Set<string> {
  if (!fs.existsSync(outputPath)) return new Set();
  try {
    const raw = JSON.parse(fs.readFileSync(outputPath, 'utf8')) as {
      id: string;
    }[];
    return new Set(raw.map(c => c.id));
  } catch (err) {
    log(`WARN: could not read existing ${outputPath}: ${(err as Error).message}`);
    return new Set();
  }
}

function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function log(msg: string): void {
  console.log(msg);
}
