import { loglev } from '@/core/logger/log';
import type { RootState } from '@/core/zustand';
import { createActions } from '@/core/zustand-helpers/actions';
import type { GameRemoteData } from '../Game';
import type { RemoteLoadedGamesList } from '../save/loadRemoteGamesList';
import type { SerializedGame } from './gameFactoriesActions';

const logger = loglev.getLogger('games:remote');

export const gameRemoteActions = createActions({
  // Sync
  setRemoteGames: (games: RemoteLoadedGamesList) => (state, get) => {
    for (const existing of Object.values(state.games.games)) {
      if (existing.savedId && !games.find(g => g.id === existing.savedId)) {
        // Registered game not found in remote list
        existing.savedId = undefined;
        existing.shareToken = undefined;
      }
    }

    for (const data of games) {
      const serialized = data.data as unknown as SerializedGame;
      loadSerializedGameIntoState(serialized, data, state);
    }
  },
  loadRemoteGame:
    (serialized: SerializedGame, data: Partial<GameRemoteData>) => state => {
      loadSerializedGameIntoState(serialized, data, state);
    },
});

function loadSerializedGameIntoState(
  serialized: SerializedGame,
  data: Partial<GameRemoteData>,
  state: RootState,
) {
  if (state.games[serialized.game.id]) {
    logger.info('Already loaded game:', serialized);
    return;
  }

  logger.info('Fully loaded game:', serialized);
  state.games.games[serialized.game.id] = { ...serialized.game };
  state.games.games[serialized.game.id].authorId = data.author_id;
  state.games.games[serialized.game.id].createdAt = data.created_at;
  state.games.games[serialized.game.id].savedId = data.id;

  serialized.factories.forEach(factory => {
    state.factories.factories[factory.id] = factory;
  });
  serialized.solvers.forEach(solver => {
    state.solvers.instances[solver.id] = solver;
  });
}
