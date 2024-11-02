import { FactoryConveyorBelts } from '@/recipes/FactoryBuilding';
import dayjs from 'dayjs';
import { useShallow } from 'zustand/shallow';
import { useStore } from '../core/zustand';
import { createSlice } from '../core/zustand-helpers/slices';
import { Game, GameSettings, type GameRemoteData } from './Game';

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
    setRemoteGameData: (gameId: string, data: GameRemoteData) => state => {
      state.games[gameId].authorId = data.author_id;
      state.games[gameId].createdAt = data.created_at;
      state.games[gameId].savedId = data.id;
      state.games[gameId].shareToken = data.share_token;
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

  const maxBeltBuilding = FactoryConveyorBelts.find(
    belt => belt.id === maxBelt,
  )!;
  return maxBeltBuilding;
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
