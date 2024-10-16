import { loglev } from '@/core/logger/log';
import type { RootState } from '@/core/zustand';
import { createActions } from '@/core/zustand-helpers/actions';
import type { RemoteLoadedGamesList } from '../save/loadRemoteGamesList';
import type { SerializedGame } from './gameFactoriesActions';

const logger = loglev.getLogger('games:remote');

export const gameRemoteActions = createActions({
  // Sync
  setRemoteGames: (games: RemoteLoadedGamesList) => (state, get) => {
    for (const data of games) {
      const serialized = data.data as unknown as SerializedGame;
      loadSerializedGameIntoState(serialized, state);
    }
  },

  loadRemoteGame: (serialized: SerializedGame) => state => {
    loadSerializedGameIntoState(serialized, state);
  },
});

function loadSerializedGameIntoState(
  serialized: SerializedGame,
  state: RootState,
) {
  if (state.games[serialized.game.id]) {
    logger.info('Already loaded game:', serialized);
    return;
  }

  logger.info('Fully loaded game:', serialized);
  state.games.games[serialized.game.id] = serialized.game;
  serialized.factories.forEach(factory => {
    state.factories.factories[factory.id] = factory;
  });
  serialized.solvers.forEach(solver => {
    state.solvers.instances[solver.id] = solver;
  });
}
