import type { JSONContent } from '@tiptap/react';
import dayjs from 'dayjs';
import { useShallow } from 'zustand/shallow';
import { useStore } from '@/core/zustand';
import { createSlice } from '@/core/zustand-helpers/slices';
import {
  FactoryBuildingsForRecipes,
  FactoryConveyorBelts,
  FactoryPipelinesExclAlternates,
} from '@/recipes/FactoryBuilding';
import { AllFactoryRecipes } from '@/recipes/FactoryRecipe';
import type { ParsedSatisfactorySave } from '@/recipes/savegame/ParseSavegameMessages';
import { ABSENCE_AS_COLLECTED_STATIC_IDS } from '@/recipes/WorldCollectibles';
import type {
  Game,
  GameRemoteData,
  GameSettings,
  ShowOutputFactoriesNodesMode,
} from './Game';
import { DEFAULT_SHOW_OUTPUT_FACTORIES_NODES } from './Game';

/**
 * Which slices of game state a savegame import should overwrite. All
 * default to `false` so callers must opt in: importing a save is a
 * destructive merge of "the game's truth lives in the .sav".
 */
export interface ApplySavegameToGameOptions {
  /**
   * Replace `game.allowedRecipes` with the recipes available in the
   * save (custom recipes are always retained since the save format
   * doesn't reference them).
   */
  defaultRecipes?: boolean;
  /**
   * Replace `game.usedNodes` with the resource nodes that have a
   * miner / pump / fracking extractor placed on them in the save.
   * An empty list clears the field so the persisted shape stays
   * clean.
   */
  usedNodes?: boolean;
  /**
   * Also extract every user-built buildable (machines, belts, pipes,
   * foundations, ...) and load it into the in-memory
   * `mapInfrastructure` slice for the map's infrastructure canvas
   * layer. Session-only — see `mapInfrastructureSlice`.
   */
  infrastructure?: boolean;
}

export interface GamesSlice {
  games: Record<string, Game>;
  selected: string | null;
}

export const gamesSlice = createSlice({
  name: 'games',
  value: {
    games: {},
    selected: null,
  } as GamesSlice,
  actions: {
    selectGame: (gameId: string) => state => {
      state.selected = gameId;
    },
    createGame: (gameId: string, game?: Partial<Game>) => state => {
      state.selected = gameId;
      state.games[gameId] = {
        id: gameId,
        name: 'New Game',
        createdAt: dayjs().toISOString(),
        ...game,
        factoriesIds: [],
        settings: {
          noHighlight100PercentUsage: false,
          highlight100PercentColor: '#339af0',
          showOutputFactoriesNodes: DEFAULT_SHOW_OUTPUT_FACTORIES_NODES,
        },
      };
    },
    deleteGameKeepFactories: (gameId: string) => state => {
      delete state.games[gameId];
      if (state.selected === gameId) {
        state.selected = null;
      }
    },
    addFactoryIdToGame:
      (gameId: string | undefined, factoryId: string) => state => {
        const targetId = gameId ?? state.selected;
        if (!targetId) {
          throw new Error('No game selected');
        }
        state.games[targetId].factoriesIds.push(factoryId);
      },
    setGameName: (gameId: string, name: string) => state => {
      state.games[gameId].name = name;
    },
    setGameNotes: (gameId: string, notes: JSONContent | null) => state => {
      if (!state.games[gameId]) return;
      state.games[gameId].notes = notes;
    },
    setSharedGameToken: (gameId: string, token: string) => state => {
      state.games[gameId].shareToken = token;
    },
    // For selected
    updateGameSettings: (fn: (state: GameSettings) => void) => state => {
      fn(state.games[state.selected!].settings);
    },
    setGameAllowedRecipes:
      (gameId: string | undefined, allowedRecipes: string[]) => state => {
        const targetId = gameId ?? state.selected;
        if (!targetId) {
          throw new Error('No game selected');
        }
        state.games[targetId].allowedRecipes = allowedRecipes;
      },
    setGameAllowedBuildings:
      (gameId: string | undefined, allowedBuildings: string[] | undefined) =>
      state => {
        const targetId = gameId ?? state.selected;
        if (!targetId) {
          throw new Error('No game selected');
        }
        state.games[targetId].allowedBuildings = allowedBuildings;
      },
    toggleGameBuilding: (buildingId: string, enabled?: boolean) => state => {
      const game = state.games[state.selected ?? ''];
      if (!game) return;

      if (!game.allowedBuildings) {
        game.allowedBuildings = [];
      }

      const index = game.allowedBuildings.indexOf(buildingId);
      const shouldAdd = enabled ?? index === -1;

      if (shouldAdd && index === -1) {
        game.allowedBuildings.push(buildingId);
      } else if (!shouldAdd && index !== -1) {
        game.allowedBuildings.splice(index, 1);
      }
    },
    enableAllGameBuildings: () => state => {
      const game = state.games[state.selected ?? ''];
      if (!game) return;
      game.allowedBuildings = FactoryBuildingsForRecipes.map(b => b.id);
    },
    disableAllGameBuildings: () => state => {
      const game = state.games[state.selected ?? ''];
      if (!game) return;
      game.allowedBuildings = [];
    },
    setRemoteGameData: (gameId: string, data: GameRemoteData) => state => {
      state.games[gameId].authorId = data.author_id;
      state.games[gameId].createdAt = data.created_at;
      state.games[gameId].savedId = data.id;
      state.games[gameId].shareToken = data.share_token;
      state.games[gameId].updatedAt = data.updated_at;
    },
    removeGameShareToken: (gameId: string) => state => {
      state.games[gameId].shareToken = undefined;
    },
    toggleGameFactoryExpanded:
      (factoryId: string, expanded?: boolean) => state => {
        const game = state.games[state.selected ?? ''];
        if (!game) return;

        if (!game.collapsedFactoriesIds) {
          game.collapsedFactoriesIds = [];
        }

        const index = game.collapsedFactoriesIds.indexOf(factoryId);
        if (expanded === undefined) {
          if (index === -1) {
            game.collapsedFactoriesIds.push(factoryId);
          } else {
            game.collapsedFactoriesIds.splice(index, 1);
          }
        } else if (expanded && index !== -1) {
          game.collapsedFactoriesIds.splice(index, 1);
        } else if (!expanded && index === -1) {
          game.collapsedFactoriesIds.push(factoryId);
        }
      },
    /**
     * Map page: marks (or unmarks) a resource node id as "used" on
     * the given game. No-op when no game id is provided so the map
     * UI stays safe when called before the user picks a game.
     */
    toggleGameUsedNode:
      (gameId: string | null | undefined, nodeId: string) => state => {
        if (!gameId) return;
        const game = state.games[gameId];
        if (!game) return;
        const current = game.usedNodes ?? [];
        const idx = current.indexOf(nodeId);
        if (idx === -1) {
          game.usedNodes = [...current, nodeId];
        } else {
          const next = [...current];
          next.splice(idx, 1);
          if (next.length === 0) {
            delete game.usedNodes;
          } else {
            game.usedNodes = next;
          }
        }
      },
    /** Map page: drops every used-node mark for the given game. */
    clearGameUsedNodes: (gameId: string | null | undefined) => state => {
      if (!gameId) return;
      const game = state.games[gameId];
      if (!game) return;
      delete game.usedNodes;
    },
    /**
     * Map page: replaces the used-node marks for the given game with
     * {@link nodeIds}. Intended for savegame import, the imported set
     * fully replaces any prior manual marks. An empty list clears the
     * field so the persisted shape stays clean. Dedupes defensively in
     * case the caller passed the same id twice.
     */
    setGameUsedNodes:
      (gameId: string | null | undefined, nodeIds: string[]) => state => {
        if (!gameId) return;
        const game = state.games[gameId];
        if (!game) return;
        if (nodeIds.length === 0) {
          delete game.usedNodes;
        } else {
          game.usedNodes = [...new Set(nodeIds)];
        }
      },
    /**
     * Single entry point for "this savegame is the source of truth for
     * this game". Each `apply` flag opts a slice of derivable state in.
     * Centralizing here keeps every import surface (map drop, map
     * filter panel, recipes drawer) producing identical store updates
     * for the same file, in a single Immer patch and a single
     * subscriber notification.
     */
    updateGameFromSavegame:
      (
        gameId: string | null | undefined,
        save: ParsedSatisfactorySave,
        apply: ApplySavegameToGameOptions = {},
      ) =>
      state => {
        if (!gameId) return;
        const game = state.games[gameId];
        if (!game) return;
        if (apply.defaultRecipes) {
          const available = new Set(save.availableRecipes);
          game.allowedRecipes = AllFactoryRecipes.filter(
            recipe => available.has(recipe.id) || recipe.customType != null,
          ).map(recipe => recipe.id);
        }
        if (apply.usedNodes) {
          if (save.usedNodeIds.length === 0) {
            delete game.usedNodes;
          } else {
            game.usedNodes = [...new Set(save.usedNodeIds)];
          }
          // The same flag covers "import what the player has done in
          // the world" — collectible pickups follow the same one-shot,
          // potentially-conflicts-with-manual-marks shape as used
          // nodes. Compute "collected = absence-as-collected static
          // ids \ pickup actors still present in the save" and replace
          // `collectedItems` with that set.
          const present = new Set(save.presentCollectibleIds);
          const collected: string[] = [];
          for (const id of ABSENCE_AS_COLLECTED_STATIC_IDS) {
            if (!present.has(id)) collected.push(id);
          }
          if (collected.length === 0) {
            delete game.collectedItems;
          } else {
            game.collectedItems = collected;
          }
        }
        // Randomized-node overrides are world-state truth: there is no
        // user choice that could conflict, so this writes
        // unconditionally on every import (no `apply` flag — see
        // `feedback_savegame_import_flags` memory). Empty arrays from
        // a vanilla save still clear the field so a player who imports
        // a non-randomized save *after* a randomized one falls back to
        // the static dataset.
        if (save.nodeOverrides.length === 0) {
          delete game.savegameNodeOverrides;
        } else {
          game.savegameNodeOverrides = save.nodeOverrides;
        }
      },
    /**
     * Map page: marks (or unmarks) a collectible id as "collected" on
     * the given game. Mirrors {@link toggleGameUsedNode} so the two
     * map-side toggles behave identically.
     */
    toggleGameCollectedItem:
      (gameId: string | null | undefined, itemId: string) => state => {
        if (!gameId) return;
        const game = state.games[gameId];
        if (!game) return;
        const current = game.collectedItems ?? [];
        const idx = current.indexOf(itemId);
        if (idx === -1) {
          game.collectedItems = [...current, itemId];
        } else {
          const next = [...current];
          next.splice(idx, 1);
          if (next.length === 0) {
            delete game.collectedItems;
          } else {
            game.collectedItems = next;
          }
        }
      },
    /** Map page: drops every collected mark for the given game. */
    clearGameCollectedItems: (gameId: string | null | undefined) => state => {
      if (!gameId) return;
      const game = state.games[gameId];
      if (!game) return;
      delete game.collectedItems;
    },
    toggleAllFactoriesExpanded: (expanded?: boolean) => state => {
      const game = state.games[state.selected ?? ''];
      if (!game) return;

      if (!game.collapsedFactoriesIds) {
        game.collapsedFactoriesIds = [];
      }

      if (expanded === undefined) {
        if (game.collapsedFactoriesIds.length > 0) {
          game.collapsedFactoriesIds = [];
        } else {
          game.collapsedFactoriesIds = game.factoriesIds;
        }
      } else if (expanded) {
        game.collapsedFactoriesIds = [];
      } else {
        game.collapsedFactoriesIds = game.factoriesIds;
      }
    },
  },
});

export function useGameSettings() {
  return useStore(
    useShallow(
      state => state.games.games[state.games.selected ?? '']?.settings,
    ),
  );
}

export function useGameNotes() {
  return useStore(
    state => state.games.games[state.games.selected ?? '']?.notes ?? null,
  );
}

export function useSelectedGameId() {
  return useStore(state => state.games.selected);
}

export function useGameAllowedBuildings() {
  return useStore(
    useShallow(
      state => state.games.games[state.games.selected ?? '']?.allowedBuildings,
    ),
  );
}

export function useGameSetting(
  key: keyof GameSettings,
  defaultValue?: GameSettings[keyof GameSettings],
) {
  return useStore(
    useShallow(
      state =>
        state.games.games[state.games.selected ?? '']?.settings?.[key] ??
        defaultValue,
    ),
  );
}

export function useGameSettingMaxBelt() {
  const maxBelt = useGameSetting('maxBelt');
  if (!maxBelt) return null;

  return FactoryConveyorBelts.find(belt => belt.id === maxBelt)!;
}

/**
 * Typed reader for the `showOutputFactoriesNodes` setting that falls
 * back to the documented default for games (or store states) where the
 * field hasn't been backfilled yet. Use this anywhere the solver graph
 * needs to know whether to render output-consumer / unallocated nodes.
 */
export function useShowOutputFactoriesNodes(): ShowOutputFactoriesNodesMode {
  return useStore(
    state =>
      (state.games.games[state.games.selected ?? '']?.settings
        ?.showOutputFactoriesNodes as
        | ShowOutputFactoriesNodesMode
        | undefined) ?? DEFAULT_SHOW_OUTPUT_FACTORIES_NODES,
  );
}

/**
 * Imperative setter for the same setting — handy from outside React
 * (e.g. from popover dropdowns that prefer `useStore.getState()` over
 * threading the slice action through props).
 */
export function setShowOutputFactoriesNodes(
  value: ShowOutputFactoriesNodesMode,
) {
  useStore.getState().updateGameSettings(state => {
    state.showOutputFactoriesNodes = value;
  });
}

export function useGameSettingMaxPipeline() {
  const maxPipeline = useGameSetting('maxPipeline');
  if (!maxPipeline) return null;

  return FactoryPipelinesExclAlternates.find(
    pipeline => pipeline.id === maxPipeline,
  )!;
}

export function useGameFactoriesIds(gameId: string | null | undefined) {
  return useStore(
    useShallow(state =>
      gameId ? state.games.games[gameId]?.factoriesIds : [],
    ),
  );
}

export function useGameFactoryIsCollapsed(factoryId: string): boolean {
  return useStore(
    state =>
      state.games.games[
        state.games.selected ?? ''
      ]?.collapsedFactoriesIds?.includes(factoryId) ?? false,
  );
}

export function useGameFactoriesHasAnyCollapsed(): boolean {
  return useStore(
    state =>
      (state.games.games[state.games.selected ?? '']?.collapsedFactoriesIds
        ?.length ?? 0) > 0,
  );
}
