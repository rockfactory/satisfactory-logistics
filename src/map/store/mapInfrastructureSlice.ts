import { createSlice } from '@/core/zustand-helpers/slices';
import type {
  ParsedInfrastructure,
  ParsedPlayerPosition,
} from '@/recipes/savegame/ParseSavegameMessages';

/**
 * In-memory only: the parsed user-built infrastructure for the
 * currently active game. Excluded from persistence in the root store's
 * `partialize`, so it disappears on reload — by design. The data set is
 * a few MB of typed arrays; persisting it would gum up cloud sync and
 * IndexedDB without giving the user much benefit (re-parsing the
 * `.sav` is fast and explicit).
 *
 * The `gameId` is kept alongside the payload so a reader can tell
 * whether the in-memory data is for the currently selected game and
 * fall back to "no infrastructure" if the user has switched games.
 */
export interface MapInfrastructureSlice {
  /** Parsed payload from the worker, or `null` if nothing is loaded. */
  infrastructure: ParsedInfrastructure | null;
  /**
   * World-cm positions of every `Char_Player_C` actor extracted from
   * the most recent savegame import. Empty array when nothing is
   * loaded or the save had no spawned player. The first entry is
   * treated as the host and used as the centering target on import /
   * "Locate".
   */
  players: ParsedPlayerPosition[];
  /** Game id the payload was imported for. */
  gameId: string | null;
  /** When the payload was set, in ms since epoch. Used for cache keys. */
  loadedAt: number | null;
  /**
   * Bumped to a new timestamp whenever the user asks the map to re-frame
   * itself around the loaded infrastructure (e.g. clicking "Locate"). The
   * canvas layer owns the camera and listens for changes here so the
   * filter panel doesn't need a direct handle on the Leaflet `Map`.
   */
  requestedFitAt: number | null;
}

export const initialMapInfrastructureState = (): MapInfrastructureSlice => ({
  infrastructure: null,
  players: [],
  gameId: null,
  loadedAt: null,
  requestedFitAt: null,
});

export const mapInfrastructureSlice = createSlice({
  name: 'mapInfrastructure',
  value: initialMapInfrastructureState() as MapInfrastructureSlice,
  actions: {
    setInfrastructure:
      (gameId: string, infrastructure: ParsedInfrastructure) => state => {
        state.infrastructure = infrastructure;
        state.gameId = gameId;
        state.loadedAt = Date.now();
        // Pan/zoom to the freshly imported geometry the first time it
        // arrives, otherwise it lives invisibly off-viewport for users
        // who haven't already centered the map on their factory.
        state.requestedFitAt = state.loadedAt;
      },
    setPlayers: (gameId: string, players: ParsedPlayerPosition[]) => state => {
      state.players = players;
      if (state.gameId !== gameId) {
        state.gameId = gameId;
        state.loadedAt = Date.now();
      }
      // Trigger re-framing so the camera centers on the player even
      // for recipes-only imports (where `setInfrastructure` is not
      // dispatched and would otherwise leave the view untouched).
      state.requestedFitAt = Date.now();
    },
    clearInfrastructure: () => state => {
      state.infrastructure = null;
      state.players = [];
      state.gameId = null;
      state.loadedAt = null;
      state.requestedFitAt = null;
    },
    requestInfrastructureFit: () => state => {
      state.requestedFitAt = Date.now();
    },
  },
});
