import RawWorldCollectibles from './WorldCollectibles.json';

/**
 * Pickup-style entities scattered around the world, separate from
 * extractable resource nodes. Each type is a distinct collectible
 * "track" the player completes once per game (the slugs/sloops/spheres
 * stack across the run, but the location itself is one-and-done).
 *
 * The keys here are stable storage tokens — they're persisted in the
 * Zustand `collectedByGame` map, so don't rename without a migration.
 */
export type CollectibleType =
  | 'slugMk1'
  | 'slugMk2'
  | 'slugMk3'
  | 'somersloop'
  | 'mercerSphere'
  | 'hardDrive'
  | 'audioTape'
  | 'customizationUnlock';

export const COLLECTIBLE_TYPES: CollectibleType[] = [
  'slugMk1',
  'slugMk2',
  'slugMk3',
  'somersloop',
  'mercerSphere',
  'hardDrive',
  'audioTape',
  'customizationUnlock',
];

/**
 * Display + visual metadata for each collectible type, used by the
 * filter panel rows, marker icons, and popover headers. `iconImagePath`
 * points at a bundled `/images/game/*` asset (preserves the resource-
 * marker visual language); `iconName` falls back to a Tabler icon for
 * collectibles whose game art isn't bundled (drop pods, audio tapes).
 */
export interface CollectibleTypeMeta {
  type: CollectibleType;
  displayName: string;
  shortName: string;
  /**
   * Path to a bundled image asset (e.g.
   * `/images/game/power-slug-green_64.png`). When unset, callers fall
   * back to `iconName` and render a Tabler icon instead.
   */
  iconImagePath?: string;
  /**
   * Tabler icon name (e.g. `IconPackage`). Used only when the
   * collectible has no bundled game art.
   */
  iconName?: string;
  /**
   * Ring/badge color used for the marker outline and the filter row's
   * count chip. CSS color string. Picks lean toward the in-game color
   * of the item (slugs especially).
   */
  color: string;
  /** One-line player-facing description shown in the popover. */
  description: string;
}

export const COLLECTIBLE_TYPE_META: Record<CollectibleType, CollectibleTypeMeta> =
  {
    slugMk1: {
      type: 'slugMk1',
      displayName: 'Blue Power Slug',
      shortName: 'Mk1 Slug',
      iconImagePath: '/images/game/power-slug-green_64.png',
      color: '#3498db',
      description: 'Refines into 1 Power Shard at a Constructor.',
    },
    slugMk2: {
      type: 'slugMk2',
      displayName: 'Yellow Power Slug',
      shortName: 'Mk2 Slug',
      iconImagePath: '/images/game/power-slug-yellow_64.png',
      color: '#f1c40f',
      description: 'Refines into 2 Power Shards at a Constructor.',
    },
    slugMk3: {
      type: 'slugMk3',
      displayName: 'Purple Power Slug',
      shortName: 'Mk3 Slug',
      iconImagePath: '/images/game/power-slug-purple_64.png',
      color: '#9b59b6',
      description: 'Refines into 5 Power Shards at a Constructor.',
    },
    somersloop: {
      type: 'somersloop',
      displayName: 'Somersloop',
      shortName: 'Sloop',
      iconImagePath: '/images/game/wat-1_64.png',
      color: '#e91e63',
      description: 'Doubles output of any Manufacturer when slotted in.',
    },
    mercerSphere: {
      type: 'mercerSphere',
      displayName: 'Mercer Sphere',
      shortName: 'Sphere',
      iconImagePath: '/images/game/wat-2_64.png',
      color: '#1abc9c',
      description: 'Powers the Dimensional Depot at a Mercer Sphere shrine.',
    },
    hardDrive: {
      type: 'hardDrive',
      displayName: 'Hard Drive (Drop Pod)',
      shortName: 'HD',
      iconName: 'IconPackage',
      color: '#e67e22',
      description:
        'Crashed drop pod. Open with the listed cost to claim a hard drive for the MAM.',
    },
    audioTape: {
      type: 'audioTape',
      displayName: 'Audio Tape',
      shortName: 'Tape',
      iconName: 'IconDeviceAudioTape',
      color: '#95a5a6',
      description: 'Adds a song to your boombox playlist.',
    },
    customizationUnlock: {
      type: 'customizationUnlock',
      displayName: 'Customization Unlock',
      shortName: 'Cosmetic',
      iconName: 'IconBrush',
      color: '#bdc3c7',
      description: 'Unlocks a cosmetic / paint job.',
    },
  };

/**
 * Item cost the player has to pay to open a drop pod. Mirrors UE's
 * `EFGDropPodUnlockCostType::Item` — power costs aren't represented
 * yet (they don't appear in vanilla 1.0 drop pod definitions).
 */
export interface DropPodUnlockCost {
  /** Item id matching `AllFactoryItemsMap`, e.g. `Desc_ModularFrame_C`. */
  item: string;
  /** Stack amount required to consume. */
  amount: number;
}

export interface WorldCollectible {
  /**
   * Satisfactory actor id — the exact string the game uses internally
   * for this pickup (e.g. `BP_Crystal_C_UAID_…`). Persists across
   * runs of the parser as long as the game's actor stays put, and is
   * the key for "collected" marks.
   */
  id: string;
  /** Discriminator for the marker icon, popover layout, and filters. */
  type: CollectibleType;
  /**
   * Full blueprint class path of the spawning actor (e.g.
   * `BP_Crystal_C`). Preserved so a future savegame parser can
   * cross-reference these without translating the id format.
   */
  classPath?: string;
  /**
   * Stable cross-run identity for the pickup, when present. UE's
   * `mItemPickupGuid` stays constant across patches, so the savegame
   * parser can use it to resolve already-collected pickups even when
   * the actor `Name` changes between game versions.
   */
  pickupGuid?: string;
  /**
   * Game-world coordinates in centimeters (Unreal default unit). Same
   * convention as `WorldResourceNode`.
   */
  x: number;
  y: number;
  z?: number;
  /** Yaw rotation in degrees, when reported by the source dataset. */
  rotation?: number;
  /**
   * Drop-pod-only: the item cost to open the pod. Empty for
   * collectibles that don't use this mechanic.
   */
  unlockCost?: DropPodUnlockCost[];
  /**
   * Audio-tape-only: the schematic id (e.g. `Schematic_Huntdown_C`)
   * the tape unlocks. Surface in the popover so the player can
   * identify the song without picking it up.
   */
  schematicId?: string;
  /**
   * Where the data point came from. Mirrors `WorldResourceNode.source`
   * to leave room for a future savegame-derived overlay.
   */
  source: 'static' | 'savegame';
}

interface RawCollectible {
  id: string;
  type: CollectibleType;
  classPath?: string;
  pickupGuid?: string;
  x: number;
  y: number;
  z?: number;
  rotation?: number;
  unlockCost?: DropPodUnlockCost[];
  schematicId?: string;
}

const StaticWorldCollectibles: WorldCollectible[] = (
  RawWorldCollectibles as RawCollectible[]
).map(c => ({ ...c, source: 'static' as const }));

/**
 * Per-game savegame-derived overrides. Returns an empty list today;
 * the same shape as {@link getSavegameOverridesForCollectibles}'s
 * eventual savegame parser. Kept stable so consumers don't change
 * shape when that lands.
 */
export function getSavegameCollectibleOverrides(
  _gameId?: string | null,
): WorldCollectible[] {
  return [];
}

/**
 * Returns every collectible to render on the map for the given game.
 * Falls back to the bundled static dataset; per-game savegame-derived
 * collectibles (when present) supersede static entries with matching
 * ids.
 */
export function getWorldCollectibles(
  gameId?: string | null,
): WorldCollectible[] {
  const overrides = getSavegameCollectibleOverrides(gameId);
  if (overrides.length === 0) return StaticWorldCollectibles;
  const overrideIds = new Set(overrides.map(c => c.id));
  return [
    ...StaticWorldCollectibles.filter(c => !overrideIds.has(c.id)),
    ...overrides,
  ];
}

/**
 * Total counts per type across the static dataset, for the filter
 * panel's "X of Y collected" rendering. Computed once at module load.
 */
export const COLLECTIBLE_TOTALS_BY_TYPE: Record<CollectibleType, number> = (() => {
  const totals: Record<CollectibleType, number> = {
    slugMk1: 0,
    slugMk2: 0,
    slugMk3: 0,
    somersloop: 0,
    mercerSphere: 0,
    hardDrive: 0,
    audioTape: 0,
    customizationUnlock: 0,
  };
  for (const c of StaticWorldCollectibles) totals[c.type] += 1;
  return totals;
})();
