import RawWorldResourceNodes from './WorldResourceNodes.json';

export type Purity = 'impure' | 'normal' | 'pure';

export const PURITIES: Purity[] = ['impure', 'normal', 'pure'];

/**
 * Kinds of extractable deposit the game distinguishes. Matches
 * Satisfactory's own actor taxonomy:
 *
 * - `node` — solid miner-ore nodes (`BP_ResourceNode_C`).
 * - `deposit` — breakable rock deposits harvested by the portable
 *   miner. FicsIt Remote Monitoring exposes these via
 *   `getResourceDeposit`.
 * - `frackingCore` — the central ring of a fracking well that
 *   powers the surrounding satellites.
 * - `frackingSatellite` — the pressurised fluid/gas extraction
 *   points around a core (`BP_FrackingSatellite_C`).
 * - `geyser` — geothermal generator spots
 *   (`BP_ResourceNodeGeyser_C`).
 *
 * We don't render geysers today (they're power-only), but the type
 * is kept so the importer can round-trip them without information
 * loss.
 */
export type WorldResourceNodeType =
  | 'node'
  | 'deposit'
  | 'frackingCore'
  | 'frackingSatellite'
  | 'geyser';

export interface WorldResourceNode {
  /**
   * Satisfactory actor id — the exact string the game uses internally
   * for this deposit (e.g. `BP_ResourceNode573_UAID_40B076...`). Also
   * serves as the key for "used" marks so a future savegame parser
   * can match up what the player has built on without translation.
   */
  id: string;
  /** Item id matching `AllFactoryItemsMap`, e.g. `Desc_OreIron_C`. */
  resource: string;
  /**
   * Full blueprint class path of the spawning actor
   * (e.g. `BP_ResourceNode_C`). Preserved for future savegame parsing
   * since the same field appears in the `.sav` object header.
   */
  classPath?: string;
  /** Which extractor family this deposit belongs to. */
  nodeType: WorldResourceNodeType;
  /** Display name as shown in-game (e.g. "Iron Ore", "Crude Oil"). */
  displayName?: string;
  purity: Purity;
  /** Game-world coordinates in centimeters (Unreal default unit). */
  x: number;
  y: number;
  z?: number;
  /** Yaw rotation in degrees, as reported by the source dataset. */
  rotation?: number;
  /**
   * Where the data point came from: the bundled curated dataset, or
   * extracted from a user's savegame in a future iteration.
   */
  source: 'static' | 'savegame';
}

interface RawNode {
  id: string;
  resource: string;
  purity: Purity;
  classPath?: string;
  nodeType?: WorldResourceNodeType;
  displayName?: string;
  x: number;
  y: number;
  z?: number;
  rotation?: number;
}

const StaticWorldResourceNodes: WorldResourceNode[] = (
  RawWorldResourceNodes as RawNode[]
).map(node => ({
  ...node,
  // Older bundled datasets (pre-schema-v2) lacked `nodeType`. Fall
  // back to `'node'` so those entries remain renderable.
  nodeType: node.nodeType ?? 'node',
  source: 'static' as const,
}));

/**
 * Per-game savegame-derived overrides. Returns an empty list today; the
 * savegame parser will populate this in a future iteration. Kept as a
 * stable hook so the consumer (`getWorldResourceNodes`) does not change
 * shape when that lands.
 */
export function getSavegameOverrides(
  _gameId?: string | null,
): WorldResourceNode[] {
  return [];
}

/**
 * Returns the list of world resource nodes to render on the map for the
 * given game. Falls back to the bundled static dataset; per-game
 * savegame-derived nodes (when present) supersede static entries with
 * matching ids.
 */
export function getWorldResourceNodes(
  gameId?: string | null,
): WorldResourceNode[] {
  const overrides = getSavegameOverrides(gameId);
  if (overrides.length === 0) return StaticWorldResourceNodes;

  const overrideIds = new Set(overrides.map(n => n.id));
  return [
    ...StaticWorldResourceNodes.filter(n => !overrideIds.has(n.id)),
    ...overrides,
  ];
}
