import dayjs from 'dayjs';
import { cloneDeep, omit } from 'lodash';
import { v4 } from 'uuid';
import { useStore } from '@/core/zustand';
import { createActions } from '@/core/zustand-helpers/actions';
import type { Factory } from '@/factories/Factory';
import type { Game } from '@/games/Game';
import { allowedToBlockedBuildings } from '@/solver/store/allowedToBlockedBuildings';
import type { SolverInstance } from '@/solver/store/Solver';

export const SERIALIZED_FACTORY_SCHEMA_VERSION = 1;

export type SerializedFactory = {
  schemaVersion: typeof SERIALIZED_FACTORY_SCHEMA_VERSION;
  kind: 'factory';
  factory: Factory;
  solver?: SolverInstance;
  exportedAt: string;
  /** Informational hint, shown in UI but not used for validation. */
  gameName?: string;
};

export function isSerializedFactory(
  value: unknown,
): value is SerializedFactory {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<SerializedFactory>;
  return (
    v.kind === 'factory' &&
    v.schemaVersion === SERIALIZED_FACTORY_SCHEMA_VERSION &&
    typeof v.factory === 'object' &&
    v.factory != null
  );
}

/**
 * Returns a name that doesn't collide with any of `existingNames`. If the
 * incoming name is already free, returns it unchanged. Otherwise appends
 * " (Copy)", then " (Copy 2)", " (Copy 3)" and so on.
 */
function disambiguateFactoryName(
  baseName: string | null | undefined,
  existingNames: Set<string>,
): string | null | undefined {
  if (baseName == null || baseName === '') return baseName;
  if (!existingNames.has(baseName)) return baseName;
  let attempt = `${baseName} (Copy)`;
  let counter = 2;
  while (existingNames.has(attempt)) {
    attempt = `${baseName} (Copy ${counter})`;
    counter += 1;
  }
  return attempt;
}

export const gameFactoriesActions = createActions({
  initGame: (game: Partial<Game>) => state => {
    const gameId = v4();
    const factoryId = v4();
    state.games.selected = gameId;
    state.factories.factories[factoryId] = {
      id: factoryId,
      // name: 'New Factory',
      inputs: [],
      outputs: [{ resource: null, amount: null }],
      progress: 'draft',
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
    (
      factoryId: string,
      gameId?: string | null,
      factory?: Partial<Omit<Factory, 'id'>>,
    ) =>
    (state, get) => {
      const targetId = gameId ?? state.games.selected;
      if (!targetId) {
        throw new Error('No game selected');
      }

      get().createFactory(factoryId, factory);
      get().addFactoryIdToGame(targetId, factoryId);
    },
  cloneGameFactory: (factoryId: string) => state => {
    const factory = state.factories.factories[factoryId];
    if (!factory) {
      throw new Error('No factory found');
    }

    const newFactoryId = v4();
    state.factories.factories[newFactoryId] = {
      ...cloneDeep(factory),
      name: `${factory.name ?? ''} (Copy)`,
      id: newFactoryId,
    };
    if (state.solvers.instances[factoryId]) {
      state.solvers.instances[newFactoryId] = {
        ...cloneDeep(state.solvers.instances[factoryId]),
        id: newFactoryId,
      };
    }

    state.games.games[state.games.selected!].factoriesIds.push(newFactoryId);
  },
  /**
   * Imports a `SerializedFactory` payload into the currently-selected game.
   * The caller mints `newFactoryId` (so it can navigate to the new factory
   * after dispatch). Sync metadata on the solver is stripped: the imported
   * factory is local, not a remote-shared copy.
   *
   * If a factory with the same name already exists in the target game, the
   * imported factory is renamed by appending " (Copy)" / " (Copy 2)" / ...
   * so the user can tell the two apart in the list.
   */
  importSerializedFactoryIntoCurrentGame:
    (newFactoryId: string, payload: SerializedFactory) => state => {
      const targetGameId = state.games.selected;
      if (!targetGameId || !state.games.games[targetGameId]) {
        throw new Error('No game selected');
      }

      const targetGame = state.games.games[targetGameId];
      const existingNames = new Set(
        targetGame.factoriesIds
          .map(id => state.factories.factories[id]?.name ?? null)
          .filter((name): name is string => typeof name === 'string'),
      );

      const importedFactory: Factory = {
        ...cloneDeep(payload.factory),
        id: newFactoryId,
        name: disambiguateFactoryName(payload.factory.name, existingNames),
        // Cross-factory references don't exist in the target game, so drop
        // them to avoid orphan links pointing at unrelated factories.
        inputs: (payload.factory.inputs ?? []).map(input => ({
          ...input,
          factoryId: null,
        })),
      };
      state.factories.factories[newFactoryId] = importedFactory;

      if (payload.solver) {
        const importedSolver: SolverInstance = {
          ...cloneDeep(payload.solver),
          id: newFactoryId,
          sharedId: undefined,
          remoteSharedId: undefined,
          isOwner: true,
          isFactory: true,
        };
        state.solvers.instances[newFactoryId] = importedSolver;
      }

      state.games.games[targetGameId].factoriesIds.push(newFactoryId);
    },
  // TODO For now only for selected game
  removeGameFactory: (factoryId: string) => state => {
    const index =
      state.games.games[state.games.selected!].factoriesIds.indexOf(factoryId);
    state.games.games[state.games.selected!].factoriesIds.splice(index, 1);
    delete state.factories.factories[factoryId];
    if (state.solvers.instances[factoryId]) {
      delete state.solvers.instances[factoryId];
    }
  },
  removeGame: (gameId: string) => state => {
    const game = state.games.games[gameId ?? ''];
    if (!game) {
      throw new Error('No game found');
    }

    for (const factoryId of game.factoriesIds) {
      delete state.factories.factories[factoryId];
      delete state.solvers.instances[factoryId];
    }

    delete state.games.games[gameId];
    delete state.gameSave.dirtyAt[gameId];
    if (state.games.selected === gameId) {
      state.games.selected = null;
    }
  },
  /**
   * Syncs the game's allowedBuildings to all factory solvers' blockedBuildings
   */
  syncGameBuildingsToFactories: (gameId?: string | null) => state => {
    const targetId = gameId ?? state.games.selected;
    if (!targetId) return;

    const game = state.games.games[targetId];
    if (!game) return;

    const blockedBuildings = allowedToBlockedBuildings(game.allowedBuildings);

    game.factoriesIds.forEach(factoryId => {
      const factory = state.factories.factories[factoryId];
      const solver = state.solvers.instances[factoryId];

      // Skip if factory has its own building overrides
      if (
        factory?.allowedBuildings !== undefined &&
        factory?.allowedBuildings !== null
      ) {
        return;
      }

      if (solver) {
        solver.request.blockedBuildings = blockedBuildings;
      }
    });
  },
});

export type SerializedGame = {
  game: Omit<Game, 'createdAt' | 'updatedAt' | 'authorId' | 'savedId'>;
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
    game: omit(game, ['createdAt', 'updatedAt', 'authorId', 'savedId']),
    factories: game?.factoriesIds.map(
      factoryId => state.factories.factories[factoryId],
    ),
    solvers: game?.factoriesIds
      .map(factoryId => state.solvers.instances[factoryId])
      .filter(Boolean) as SolverInstance[],
  };
}

/**
 * Builds a standalone `SerializedFactory` payload for the given factory id.
 * Strips share-sync metadata from the solver and clears cross-factory input
 * links (those refer to factories that won't exist in the target game).
 */
export function serializeFactory(factoryId: string): SerializedFactory {
  const state = useStore.getState();
  const factory = state.factories.factories[factoryId];
  if (!factory) {
    throw new Error('Factory not found');
  }
  const solver = state.solvers.instances[factoryId];
  const ownerGame = Object.values(state.games.games).find(g =>
    g.factoriesIds.includes(factoryId),
  );

  const cleanedFactory: Factory = {
    ...cloneDeep(factory),
    inputs: (factory.inputs ?? []).map(input => ({
      ...input,
      factoryId: null,
    })),
  };

  const cleanedSolver: SolverInstance | undefined = solver
    ? {
        ...cloneDeep(solver),
        sharedId: undefined,
        remoteSharedId: undefined,
        isOwner: undefined,
        isFactory: undefined,
      }
    : undefined;

  return {
    schemaVersion: SERIALIZED_FACTORY_SCHEMA_VERSION,
    kind: 'factory',
    factory: cleanedFactory,
    solver: cleanedSolver,
    exportedAt: dayjs().toISOString(),
    gameName: ownerGame?.name,
  };
}
