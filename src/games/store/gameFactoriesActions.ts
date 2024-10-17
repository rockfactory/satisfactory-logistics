import type { SolverInstance } from '@/solver/store/Solver';
import dayjs from 'dayjs';
import { omit } from 'lodash';
import { v4 } from 'uuid';
import { useStore } from '../../core/zustand';
import { createActions } from '../../core/zustand-helpers/actions';
import { Factory } from '../../factories/Factory';
import { Game } from '../Game';

export const gameFactoriesActions = createActions({
  initGame: (game: Partial<Game>) => state => {
    const gameId = v4();
    const factoryId = v4();
    state.games.selected = gameId;
    state.factories.factories[factoryId] = {
      id: factoryId,
      // name: 'New Factory',
      inputs: [],
      outputs: [],
    };
    state.games.games[gameId] = {
      id: gameId,
      name: 'New Game',
      createdAt: dayjs().toISOString(),
      settings: {
        noHighlight100PercentUsage: false,
        highlight100PercentColor: '#339af0',
      },
      ...game,
      factoriesIds: [factoryId],
    };
  },
  addGameFactory:
    (gameId?: string | null, factory?: Partial<Omit<Factory, 'id'>>) =>
    (state, get) => {
      const factoryId = v4();
      const targetId = gameId ?? state.games.selected;
      if (!targetId) {
        throw new Error('No game selected');
      }

      get().createFactory(factoryId, factory);
      get().addFactoryIdToGame(targetId, factoryId);
    },
  // TODO For now only for selected game
  removeGameFactory: (factoryId: string) => state => {
    const index =
      state.games.games[state.games.selected!].factoriesIds.indexOf(factoryId);
    state.games.games[state.games.selected!].factoriesIds.splice(index, 1);
    delete state.factories.factories[factoryId];
  },
});

export type SerializedGame = {
  game: Omit<Game, 'createdAt' | 'authorId' | 'savedId'>;
  factories: Factory[];
  solvers: SolverInstance[];
};

export function serializeGame(
  gameId: string | null | undefined,
): SerializedGame {
  const state = useStore.getState();
  const game = state.games.games[gameId ?? state.games.selected ?? ''];
  if (!game) {
    throw new Error('Game not found');
  }
  return {
    game: omit(game, ['createdAt', 'authorId', 'savedId']),
    factories: game?.factoriesIds.map(
      factoryId => state.factories.factories[factoryId],
    ),
    solvers: game?.factoriesIds
      .map(factoryId => state.solvers.instances[factoryId])
      .filter(Boolean) as SolverInstance[],
  };
}
