import { v4 } from 'uuid';
import { createActions, createSlice } from '../core/zustand';
import { Factory } from '../factories/Factory';

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

export interface GamesSlice {
  games: Record<string, IGame>;
  selected: string | null;
}

// export const createGamesSlice: StateCreator<
//     GamesSlice,

export const gamesSlice = createSlice({
  name: 'games',
  value: {
    games: {} as Record<string, IGame>,
    selected: null as string | null,
  },
  actions: {
    selectGame: (gameId: string) => state => {
      state.selected = gameId;
    },
    // addFactory: (gameId: string, factory: Factory) =>
    //   set(state => {
    //     state.games[gameId].factories.push(factory);
    //   }),
  },
});

export const gameFactoriesActions = createActions({
  addGameFactory:
    (gameId: string, factory?: Partial<Omit<Factory, 'id'>>) => state => {
      state.games.games[gameId].factories.push({
        id: v4(),
        ...factory,
      });
    },
});

// export const gamesSlice = createSliceWithImmer({
//   name: 'games',
//   value: {
//     games: {} as Record<string, IGame>,
//     selected: null as string | null,
//   },
//   actions: {
//     selectGame: (gameId: string) => state => {
//       state.selected = gameId;
//     },
//     addFactory: (gameId: string, factory: Factory) => state => {
//       state.games[gameId].factories.push(factory);
//     },
//   },
// });

// export const useGameFactories = useStore(useShallow(state =>
//   !state.games.selected
//     ? []
//     : state.games.games[state.games.selected].factories,
// );
