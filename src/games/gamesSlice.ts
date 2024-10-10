import { createSliceWithImmer } from 'zustand-slices/immer';
import { useStore } from '../core/storex';
import { Factory } from '../factories/Factory';
import { StateCreator } from 'zustand';

export interface IGame {
  id: string;
  name: string;
  factories: Factory[];
  factoriesFilters: FactoriesFilters;
  settings: GameSettings;
}

interface FactoriesFilters {
  name: string | null;
  resource: string | null;
  viewMode?: 'compact' | 'wide';
}

interface GameSettings {
  noHighlight100PercentUsage?: boolean;
  highlight100PercentColor?: string;
}

interface GamesSlice {
    games: Record<string, IGame>;
    selected: string | null;
}

// export const createGamesSlice: StateCreator<
//     GamesSlice,


export const gamesSlice = createSliceWithImmer({
  name: 'games',
  value: {
    games: {} as Record<string, IGame>,
    selected: null as string | null,
  },
  actions: {
    selectGame: (gameId: string) => state => {
      state.selected = gameId;
    },
    addFactory: (gameId: string, factory: Factory) => state => {
      state.games[gameId].factories.push(factory);
    },
  },
});

export const useGameFactories = useStore(useShallow(state =>
  !state.games.selected
    ? []
    : state.games.games[state.games.selected].factories,
);
