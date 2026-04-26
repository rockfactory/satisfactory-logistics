import { useStore } from '@/core/zustand';
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
 * Static `id` → node lookup. Used by call sites that have a node id
 * from a savegame (e.g. an extractor's `mExtractableResource`) and
 * want to resolve it to its resource type / display name without
 * scanning the full array. Excludes savegame overrides; consumers
 * that need them should layer those on top.
 */
export const StaticWorldResourceNodesById: Record<string, WorldResourceNode> =
  StaticWorldResourceNodes.reduce(
    (acc, node) => {
      acc[node.id] = node;
      return acc;
    },
    {} as Record<string, WorldResourceNode>,
  );

/**
 * Per-game savegame-derived overrides. Reads the latest snapshot from
 * the zustand store and projects each `SavegameNodeOverride` onto the
 * corresponding static node, replacing `resource` (always) and
 * `purity` (when the save provided one — only fracking satellites in
 * the experimental 1.2 randomizer). Entries whose id has no static
 * counterpart are dropped: the override-only path is reserved for a
 * future iteration that handles runtime-spawned `_UAID_…` nodes
 * (which need a position + nodeType from the save itself).
 *
 * Synchronously reads from the store so callers can stay outside of
 * React; consumers that render based on this list must subscribe to
 * the same slice (e.g. via `useStore(s => …savegameNodeOverrides)`)
 * so their `useMemo` invalidates when an import lands.
 */
export function getSavegameOverrides(
  gameId?: string | null,
): WorldResourceNode[] {
  if (!gameId) return [];
  const game = useStore.getState().games.games[gameId];
  const overrides = game?.savegameNodeOverrides;
  if (!overrides || overrides.length === 0) return [];
  const projected: WorldResourceNode[] = [];
  for (const o of overrides) {
    const base = StaticWorldResourceNodesById[o.id];
    if (!base) continue;
    projected.push({
      ...base,
      resource: o.resource,
      ...(o.purity && { purity: o.purity }),
      source: 'savegame',
    });
  }
  return projected;
}

/**
 * Node types intentionally hidden from the map UI. Kept out at the
 * top-level accessor so the rest of the app (filters, popovers, sum
 * mode) never has to special-case them.
 *
 * - `frackingCore` — the well's anchor point. Players don't extract
 *   from it directly; they place a Resource Well Pressurizer here to
 *   activate the surrounding satellites. The satellites themselves
 *   already mark every extraction location, so cores are noise.
 *
 * The underlying dataset still includes these (the parser keeps the
 * full world picture so future features — e.g. drawing lines from
 * satellites to their parent core — can opt back in via a separate
 * accessor).
 */
const HIDDEN_NODE_TYPES: ReadonlySet<WorldResourceNodeType> = new Set([
  'frackingCore',
]);

/**
 * Returns the list of world resource nodes to render on the map for the
 * given game. Falls back to the bundled static dataset; per-game
 * savegame-derived nodes (when present) supersede static entries with
 * matching ids. Node types in {@link HIDDEN_NODE_TYPES} are filtered
 * out here so callers get a clean "what to render" list.
 */
export function getWorldResourceNodes(
  gameId?: string | null,
): WorldResourceNode[] {
  const overrides = getSavegameOverrides(gameId);
  const merged =
    overrides.length === 0
      ? StaticWorldResourceNodes
      : (() => {
          const overrideIds = new Set(overrides.map(n => n.id));
          return [
            ...StaticWorldResourceNodes.filter(n => !overrideIds.has(n.id)),
            ...overrides,
          ];
        })();
  return merged.filter(n => !HIDDEN_NODE_TYPES.has(n.nodeType));
}
