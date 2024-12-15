import { loglev } from '@/core/logger/log';
import { migrateSerializedGameWithPlan } from '@/core/migrations/planner/StoreMigrationPlan';
import { storeMigrationV2 } from '@/core/migrations/v2';
import { storeMigrationV4 } from '@/core/migrations/v4';
import type { RootState } from '@/core/zustand';
import { createActions } from '@/core/zustand-helpers/actions';
import type { GameRemoteData } from '@/games/Game';
import type { RemoteLoadedGamesList } from '@/games/save/loadRemoteGamesList';
import type { SerializedGame } from './gameFactoriesActions';

const logger = loglev.getLogger('games:remote');

export const gameRemoteActions = createActions({
  // Sync
  setRemoteGames: (games: RemoteLoadedGamesList) => (state, get) => {
    for (const existing of Object.values(state.games.games)) {
      if (!games.find(g => g.id === existing.savedId)) {
        // Registered game not found in remote list
        existing.savedId = undefined;
        existing.shareToken = undefined;
        existing.authorId = undefined;
      }
    }

    for (const data of games) {
      const serialized = data.data as unknown as SerializedGame;
      loadSerializedGameIntoState(serialized, data, state);
    }
  },
  loadRemoteGame:
    (
      serialized: SerializedGame,
      data: Partial<GameRemoteData>,
      options?: ILoadRemoteGameOptions,
    ) =>
    state => {
      loadSerializedGameIntoState(serialized, data, state, options);
    },
});

export interface ILoadRemoteGameOptions {
  override?: boolean;
}

function loadSerializedGameIntoState(
  serialized: SerializedGame,
  data: Partial<GameRemoteData>,
  state: RootState,
  options: ILoadRemoteGameOptions = {},
) {
  if (state.games.games[serialized.game.id] && !options.override) {
    logger.info('Already loaded game:', serialized);
    state.games.games[serialized.game.id].authorId = data.author_id;
    state.games.games[serialized.game.id].createdAt = data.created_at;
    state.games.games[serialized.game.id].savedId = data.id;
    state.games.games[serialized.game.id].shareToken = data.share_token;
    return;
  }

  // Migrations
  serialized = applyGameMigrations(serialized);

  logger.info(`Fully loaded game "${serialized.game.name}" (id=${serialized.game.id})`, serialized); // prettier-ignore
  state.games.games[serialized.game.id] = { ...serialized.game };
  state.games.games[serialized.game.id].authorId = data.author_id;
  state.games.games[serialized.game.id].createdAt = data.created_at;
  state.games.games[serialized.game.id].savedId = data.id;
  state.games.games[serialized.game.id].shareToken = data.share_token;

  serialized.factories.forEach(factory => {
    state.factories.factories[factory.id] = factory;
  });
  serialized.solvers.forEach(solver => {
    state.solvers.instances[solver.id] = solver;
  });
}

function applyGameMigrations(serializedGame: SerializedGame) {
  let game: SerializedGame = { ...serializedGame };
  if ((game.game.version ?? 1) === 1) {
    logger.info('Migrating game from version 1 to 2');
    game = migrateSerializedGameWithPlan(storeMigrationV2, game);
  }
  if (game.game.version === 3) {
    logger.info('Migrating game from version 3 to 4');
    game = migrateSerializedGameWithPlan(storeMigrationV4, game);
  }
  return game;
}
