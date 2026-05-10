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
  //
  // `setRemoteGames` is only allowed to orphan a local game (clear its
  // sync metadata) when the caller has confirmed the incoming list is
  // authoritative AND non-empty. An empty payload can mean "the user has
  // no remote games" but it can also mean transient RLS denial, partial
  // 5xx, or the user briefly switched accounts — orphaning savedIds in
  // those cases would force the next `saveRemoteGame` to insert a
  // duplicate row (see issue #127 audit, vector #5). When in doubt,
  // leave the savedId alone; the next successful refresh will reconcile.
  //
  // The incoming list is metadata-only: the full `data` blob is fetched
  // lazily by `loadRemoteGamesList` for the games that actually need it.
  // This action only refreshes pointer/timestamp fields — it never
  // mutates `factories`/`solvers`. Full-state application goes through
  // `loadRemoteGame` for those games.
  setRemoteGames:
    (games: RemoteLoadedGamesList, opts?: { authoritative?: boolean }) =>
    state => {
      const authoritative = opts?.authoritative ?? true;
      if (authoritative && games.length > 0) {
        for (const existing of Object.values(state.games.games)) {
          if (!existing.savedId) continue;
          if (!games.find(g => g.id === existing.savedId)) {
            // Confirmed gone from the user's authoritative view: drop the
            // sync metadata so it's treated as a fresh local game on the
            // next save.
            existing.savedId = undefined;
            existing.shareToken = undefined;
            existing.authorId = undefined;
          }
        }
      }

      for (const remote of games) {
        const local = Object.values(state.games.games).find(
          g => g.savedId === remote.id,
        );
        if (!local) continue;
        // Only refresh metadata when the remote stamp is NOT strictly
        // newer than local. Bumping `updatedAt` past local while leaving
        // the data stale would let the next save's optimistic-locking
        // check (`eq.updated_at = lastKnown`) pass and overwrite a
        // newer remote — exactly what the lazy full-fetch path is
        // about to handle. So skip those rows here; the lazy path
        // applies the data and refreshes metadata coherently.
        if (remote.updated_at && local.updatedAt) {
          const remoteTs = new Date(remote.updated_at).getTime();
          const localTs = new Date(local.updatedAt).getTime();
          if (remoteTs > localTs) continue;
        } else if (remote.updated_at && !local.updatedAt) {
          // Local has never been synced — let the lazy path handle it.
          continue;
        }
        local.authorId = remote.author_id;
        local.createdAt = remote.created_at;
        local.shareToken = remote.share_token;
        if (remote.updated_at) local.updatedAt = remote.updated_at;
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

export function loadSerializedGameIntoState(
  serialized: SerializedGame,
  data: Partial<GameRemoteData>,
  state: RootState,
  options: ILoadRemoteGameOptions = {},
) {
  const existing = state.games.games[serialized.game.id];

  if (existing && !options.override) {
    // Refresh metadata only when remote is not strictly newer than local.
    // If remote IS strictly newer (another device pushed changes), fall
    // through to the full-load path and apply the actual data. Otherwise
    // we'd bump `updatedAt` to the remote timestamp while keeping stale
    // data, and the next save's optimistic-locking check (saveRemoteGame:
    // `eq.updated_at = lastKnown`) would pass against the new timestamp
    // and overwrite the other device's changes.
    const localTs = existing.updatedAt
      ? new Date(existing.updatedAt).getTime()
      : 0;
    const remoteTs = data.updated_at ? new Date(data.updated_at).getTime() : 0;

    if (remoteTs <= localTs) {
      logger.info('Already loaded game:', serialized);
      existing.authorId = data.author_id;
      existing.createdAt = data.created_at;
      existing.savedId = data.id;
      existing.shareToken = data.share_token;
      if (data.updated_at) existing.updatedAt = data.updated_at;
      return;
    }

    logger.info(
      `Remote game "${serialized.game.name}" is newer (remote=${data.updated_at} > local=${existing.updatedAt}); applying full state`,
    );
    options = { ...options, override: true };
  }

  // Migrations
  serialized = applyGameMigrations(serialized);

  logger.info(
    `Fully loaded game "${serialized.game.name}" (id=${serialized.game.id})`,
    serialized,
  ); // prettier-ignore

  if (options.override) {
    const existingGame = state.games.games[serialized.game.id];
    if (existingGame) {
      const incomingFactoryIds = new Set(serialized.game.factoriesIds);
      for (const oldFactoryId of existingGame.factoriesIds) {
        if (!incomingFactoryIds.has(oldFactoryId)) {
          delete state.factories.factories[oldFactoryId];
          delete state.solvers.instances[oldFactoryId];
        }
      }
      // Bump the remote-sync epoch so views holding uncontrolled inputs
      // (spreadsheet's `<TextInput defaultValue=...>`) remount and pick up
      // the replaced state. We bump only when an existing local game is
      // actually being replaced, never on first-load (no stale UI to clear)
      // and never on plain user edits.
      state.factoryView.remoteSyncEpoch =
        (state.factoryView.remoteSyncEpoch ?? 0) + 1;
    }
  }

  state.games.games[serialized.game.id] = { ...serialized.game };
  state.games.games[serialized.game.id].authorId = data.author_id;
  state.games.games[serialized.game.id].createdAt = data.created_at;
  state.games.games[serialized.game.id].savedId = data.id;
  state.games.games[serialized.game.id].shareToken = data.share_token;
  if (data.updated_at) {
    state.games.games[serialized.game.id].updatedAt = data.updated_at;
  }

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
