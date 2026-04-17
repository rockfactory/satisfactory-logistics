import { createSlice } from '@/core/zustand-helpers/slices';
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
}

function defaultResourceFilters(): Record<string, Purity[]> {
  const filters: Record<string, Purity[]> = {};
  for (const resource of WorldResourcesList) {
    filters[resource] = [...PURITIES];
  }
  return filters;
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
    /**
     * Resets only the visibility filters back to "show everything".
     * Used-node marks are intentionally preserved — those represent
     * real player choices, not display preferences.
     */
    resetMapFilters: () => state => {
      ensureMapSliceShape(state);
      const reset = initialMapSliceState();
      state.resourceFilters = reset.resourceFilters;
      state.hideUsedNodes = reset.hideUsedNodes;
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
