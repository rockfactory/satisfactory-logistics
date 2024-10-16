import { useShallow } from 'zustand/shallow';
import { useStore } from '../core/zustand';
import { createSlice } from '../core/zustand-helpers/slices';
import { Game, GameSettings } from './Game';

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
        createdAt: new Date(),
        ...game,
        factoriesIds: [],
        settings: {
          noHighlight100PercentUsage: false,
          highlight100PercentColor: '#339af0',
        },
      };
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
  },
});

export function useGameSettings() {
  return useStore(
    useShallow(
      state => state.games.games[state.games.selected ?? '']?.settings,
    ),
  );
}

export function useGameFactoriesIds(gameId: string | null | undefined) {
  return useStore(
    useShallow(state =>
      gameId ? state.games.games[gameId]?.factoriesIds : [],
    ),
  );
}
