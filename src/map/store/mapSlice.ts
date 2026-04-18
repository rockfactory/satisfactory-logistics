import { createSlice } from '@/core/zustand-helpers/slices';
import {
  COLLECTIBLE_TYPES,
  type CollectibleType,
} from '@/recipes/WorldCollectibles';
import { PURITIES, type Purity } from '@/recipes/WorldResourceNodes';
import { WorldResourcesList } from '@/recipes/WorldResources';

/**
 * Used when the player hasn't selected a game yet. Lets us still
 * persist their "used node" decisions without dropping them on the
 * floor.
 */
export const NO_GAME_USED_NODES_KEY = '_default';

export interface MapSlice {
  /**
   * Per-resource purity filter. The set of visible nodes is the union
   * of `(resource, purity)` pairs in this map. Absent keys hide the
   * resource entirely; an empty array hides all purities for it.
   * Defaults to "every world resource visible at every purity" so the
   * map shows everything on first load.
   */
  resourceFilters: Record<string, Purity[]>;
  /**
   * Per-game record of node ids the player has marked as "used"
   * (i.e. they already built a miner on it). Keyed by the selected
   * game id, falling back to {@link NO_GAME_USED_NODES_KEY}.
   */
  usedNodesByGame: Record<string, string[]>;
  /**
   * When true, used nodes are dropped from the map render entirely.
   * When false, they're rendered with a faded/checkmark variant.
   * Persists across games.
   */
  hideUsedNodes: boolean;
  /**
   * Per-collectible-type visibility. `true` = render markers on the
   * map; `false` = hide entirely. Defaults to "everything visible".
   * Kept independent of `resourceFilters` because collectibles have
   * different semantics (no purity, no extractor) and the player will
   * want to toggle them as a separate group.
   */
  collectibleVisibility: Record<CollectibleType, boolean>;
  /**
   * Per-game record of collectible ids the player has marked as
   * "collected". Keyed the same way as {@link usedNodesByGame}.
   * Intentionally separate from used-node marks because the semantic
   * is one-time pickup vs. permanent placement, and the player may
   * want to clear one without the other.
   */
  collectedByGame: Record<string, string[]>;
  /**
   * When true, already-collected collectibles are dropped from the
   * render entirely. When false, they're shown with a faded
   * variant (like used nodes). Persists across games.
   */
  hideCollectedCollectibles: boolean;
}

function defaultResourceFilters(): Record<string, Purity[]> {
  const filters: Record<string, Purity[]> = {};
  for (const resource of WorldResourcesList) {
    filters[resource] = [...PURITIES];
  }
  return filters;
}

/**
 * Collectibles ship hidden by default. There are ~1.7k of them so
 * showing every category at once on first load drowns out the
 * resource layer; the filter panel makes opting in cheap and the
 * "0 / N collected" counter advertises the toggles are there.
 */
function defaultCollectibleVisibility(): Record<CollectibleType, boolean> {
  const visibility = {} as Record<CollectibleType, boolean>;
  for (const type of COLLECTIBLE_TYPES) visibility[type] = false;
  return visibility;
}

/**
 * Factory for a fresh {@link MapSlice}. Exported so the persist
 * migration can replace the old slice shape wholesale — zustand's
 * default shallow merge would otherwise leave the rehydrated state
 * missing the new keys.
 */
export const initialMapSliceState = (): MapSlice => ({
  resourceFilters: defaultResourceFilters(),
  usedNodesByGame: {},
  hideUsedNodes: false,
  collectibleVisibility: defaultCollectibleVisibility(),
  collectedByGame: {},
  hideCollectedCollectibles: false,
});

function gameKey(gameId?: string | null): string {
  return gameId ?? NO_GAME_USED_NODES_KEY;
}

/**
 * Ensures the slice has every expected field before an action mutates
 * it. Older persisted stores from this feature's development cycles
 * had only the old keys (`selectedResources` / `selectedPurities`) and
 * the zustand persist middleware's shallow merge leaves the slice in
 * that stale shape on rehydrate. Backfilling here keeps actions safe
 * regardless of where the slice came from.
 */
function ensureMapSliceShape(state: MapSlice): void {
  if (!state.resourceFilters) state.resourceFilters = defaultResourceFilters();
  if (!state.usedNodesByGame) state.usedNodesByGame = {};
  if (typeof state.hideUsedNodes !== 'boolean') state.hideUsedNodes = false;
  if (!state.collectibleVisibility) {
    state.collectibleVisibility = defaultCollectibleVisibility();
  } else {
    // Backfill any newly-introduced collectible types. We default
    // them off to match {@link defaultCollectibleVisibility} — the
    // player can opt in from the filter panel.
    for (const type of COLLECTIBLE_TYPES) {
      if (typeof state.collectibleVisibility[type] !== 'boolean') {
        state.collectibleVisibility[type] = false;
      }
    }
  }
  if (!state.collectedByGame) state.collectedByGame = {};
  if (typeof state.hideCollectedCollectibles !== 'boolean') {
    state.hideCollectedCollectibles = false;
  }
}

export const mapSlice = createSlice({
  name: 'map',
  value: initialMapSliceState() as MapSlice,
  actions: {
    /**
     * Toggles a single (resource, purity) pair. When the resource
     * isn't tracked yet, it's added with just this purity selected.
     */
    toggleResourcePurity: (resource: string, purity: Purity) => state => {
      ensureMapSliceShape(state);
      const current = state.resourceFilters[resource];
      if (!current) {
        state.resourceFilters[resource] = [purity];
        return;
      }
      const idx = current.indexOf(purity);
      if (idx === -1) {
        current.push(purity);
      } else {
        current.splice(idx, 1);
      }
    },
    /** Sets every selected purity for a single resource at once. */
    setResourcePurities: (resource: string, purities: Purity[]) => state => {
      ensureMapSliceShape(state);
      if (purities.length === 0) {
        delete state.resourceFilters[resource];
      } else {
        state.resourceFilters[resource] = [...purities];
      }
    },
    /**
     * Bulk action: enable or disable every world resource at every
     * purity (Reset / Clear all).
     */
    setAllResourcesEnabled: (enabled: boolean) => state => {
      ensureMapSliceShape(state);
      if (!enabled) {
        state.resourceFilters = {};
        return;
      }
      state.resourceFilters = defaultResourceFilters();
    },
    /**
     * Bulk action: across every world resource, force the given
     * purity on or off (e.g. "show only Pure", "hide all Impure").
     */
    setAllResourcesPurity: (purity: Purity, enabled: boolean) => state => {
      ensureMapSliceShape(state);
      for (const resource of WorldResourcesList) {
        const current = state.resourceFilters[resource] ?? [];
        const idx = current.indexOf(purity);
        if (enabled && idx === -1) {
          state.resourceFilters[resource] = [...current, purity];
        } else if (!enabled && idx !== -1) {
          const next = [...current];
          next.splice(idx, 1);
          if (next.length === 0) {
            delete state.resourceFilters[resource];
          } else {
            state.resourceFilters[resource] = next;
          }
        }
      }
    },
    /**
     * Convenience for "show only the given purity, on every
     * resource". Replaces any existing per-resource selection.
     */
    setOnlyPurity: (purity: Purity) => state => {
      ensureMapSliceShape(state);
      const next: Record<string, Purity[]> = {};
      for (const resource of WorldResourcesList) {
        next[resource] = [purity];
      }
      state.resourceFilters = next;
    },
    /**
     * Replaces the entire resource filter map atomically. Used by
     * the share-URL loader so applying an incoming link doesn't
     * fire 13 individual mutations and trigger 13 re-renders.
     */
    setResourceFilters: (filters: Record<string, Purity[]>) => state => {
      ensureMapSliceShape(state);
      const next: Record<string, Purity[]> = {};
      for (const [resource, purities] of Object.entries(filters)) {
        if (!WorldResourcesList.includes(resource)) continue;
        const cleaned = purities.filter(p => PURITIES.includes(p));
        if (cleaned.length > 0) next[resource] = cleaned;
      }
      state.resourceFilters = next;
    },
    /** Marks or unmarks a node id as used in the given game. */
    toggleNodeUsed:
      (gameId: string | null | undefined, nodeId: string) => state => {
        ensureMapSliceShape(state);
        const key = gameKey(gameId);
        const current = state.usedNodesByGame[key] ?? [];
        const idx = current.indexOf(nodeId);
        if (idx === -1) {
          state.usedNodesByGame[key] = [...current, nodeId];
        } else {
          const next = [...current];
          next.splice(idx, 1);
          if (next.length === 0) {
            delete state.usedNodesByGame[key];
          } else {
            state.usedNodesByGame[key] = next;
          }
        }
      },
    /** Drops every used-node mark for the given game. */
    clearUsedNodes: (gameId: string | null | undefined) => state => {
      ensureMapSliceShape(state);
      const key = gameKey(gameId);
      delete state.usedNodesByGame[key];
    },
    setHideUsedNodes: (hide: boolean) => state => {
      ensureMapSliceShape(state);
      state.hideUsedNodes = hide;
    },
    /** Toggles visibility of a single collectible type on the map. */
    toggleCollectibleType: (type: CollectibleType) => state => {
      ensureMapSliceShape(state);
      state.collectibleVisibility[type] = !state.collectibleVisibility[type];
    },
    /** Bulk action: show / hide every collectible type at once. */
    setAllCollectiblesVisible: (visible: boolean) => state => {
      ensureMapSliceShape(state);
      for (const type of COLLECTIBLE_TYPES) {
        state.collectibleVisibility[type] = visible;
      }
    },
    /**
     * Replaces the collectible visibility map atomically. Mirrors
     * {@link setResourceFilters} for the share-URL loader path.
     * Unknown keys are dropped; missing keys default to hidden so
     * older URLs (created before a new collectible type existed)
     * keep that type off, preserving the recipient's "explicit
     * opt-in" semantics for collectibles.
     */
    setCollectibleVisibility:
      (visibility: Record<CollectibleType, boolean>) => state => {
        ensureMapSliceShape(state);
        for (const type of COLLECTIBLE_TYPES) {
          state.collectibleVisibility[type] = !!visibility[type];
        }
      },
    /** Marks or unmarks a collectible id as collected in the given game. */
    toggleCollectibleCollected:
      (gameId: string | null | undefined, collectibleId: string) => state => {
        ensureMapSliceShape(state);
        const key = gameKey(gameId);
        const current = state.collectedByGame[key] ?? [];
        const idx = current.indexOf(collectibleId);
        if (idx === -1) {
          state.collectedByGame[key] = [...current, collectibleId];
        } else {
          const next = [...current];
          next.splice(idx, 1);
          if (next.length === 0) {
            delete state.collectedByGame[key];
          } else {
            state.collectedByGame[key] = next;
          }
        }
      },
    /** Drops every collected mark for the given game. */
    clearCollectedCollectibles:
      (gameId: string | null | undefined) => state => {
        ensureMapSliceShape(state);
        const key = gameKey(gameId);
        delete state.collectedByGame[key];
      },
    setHideCollectedCollectibles: (hide: boolean) => state => {
      ensureMapSliceShape(state);
      state.hideCollectedCollectibles = hide;
    },
    /**
     * Resets only the visibility filters back to "show everything".
     * Used-node marks and collected collectibles are intentionally
     * preserved — those represent real player choices, not display
     * preferences.
     */
    resetMapFilters: () => state => {
      ensureMapSliceShape(state);
      const reset = initialMapSliceState();
      state.resourceFilters = reset.resourceFilters;
      state.hideUsedNodes = reset.hideUsedNodes;
      state.collectibleVisibility = reset.collectibleVisibility;
      state.hideCollectedCollectibles = reset.hideCollectedCollectibles;
    },
  },
});

/** Reads the used-node id list for the given game, defaulting to []. */
export function getUsedNodesForGame(
  state: MapSlice,
  gameId?: string | null,
): string[] {
  return state.usedNodesByGame[gameKey(gameId)] ?? [];
}

/**
 * Reads the collected-collectible id list for the given game,
 * defaulting to []. Mirrors {@link getUsedNodesForGame} so consumers
 * have a stable accessor regardless of where the slice came from.
 */
export function getCollectedForGame(
  state: MapSlice,
  gameId?: string | null,
): string[] {
  return state.collectedByGame[gameKey(gameId)] ?? [];
}
