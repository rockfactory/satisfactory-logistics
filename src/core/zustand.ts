import { omit } from 'lodash';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import { authSlice } from '@/auth/authSlice';
import { chartsSlice } from '@/factories/charts/store/chartsSlice';
import { factoriesSlice } from '@/factories/store/factoriesSlice';
import { factoryViewSlice } from '@/factories/store/factoryViewSlice';
import { factoryViewSortActions } from '@/factories/store/factoryViewSortActions';
import { gamesSlice } from '@/games/gamesSlice';
import { gameSaveSlice } from '@/games/save/gameSaveSlice';
import { gameFactoriesActions } from '@/games/store/gameFactoriesActions';
import { gameRealtimeActions } from '@/games/store/gameRealtimeActions';
import { gameRemoteActions } from '@/games/store/gameRemoteActions';
import { peersSlice } from '@/games/sync/peersSlice';
import { mapSelectionSlice } from '@/map/store/mapSelectionSlice';
import {
  initialMapSliceState,
  type MapSlice,
  mapSlice,
} from '@/map/store/mapSlice';
import { notesUiSlice } from '@/notes/store/notesUiSlice';
import { solverFactoriesActions } from '@/solver/store/solverFactoriesActions';
import { solversSlice } from '@/solver/store/solverSlice';
import { tutorialSlice } from '@/tutorial/store/tutorialSlice';
import { loglev } from './logger/log';
import { migratePersistedStoreFromRedux } from './migrations/migratePersistedStoreFromRedux';
import { migrateStoreWithPlan } from './migrations/planner/StoreMigrationPlan';
import { removeMissingFactoriesInGames } from './migrations/removeMissingFactoriesInGames';
import { storeMigrationV2 } from './migrations/v2';
import { storeMigrationV4 } from './migrations/v4';
import { withActions } from './zustand-helpers/actions';
import { forceMigrationOnInitialPersist } from './zustand-helpers/forceMigrationOnInitialPersist';
import { indexedDbStorage } from './zustand-helpers/indexedDbStorage';
import { withSlices } from './zustand-helpers/slices';

const logger = loglev.getLogger('store:zustand');

const slices = withSlices(
  authSlice,
  gamesSlice,
  gameSaveSlice,
  factoriesSlice,
  factoryViewSlice,
  solversSlice,
  chartsSlice,
  tutorialSlice,
  notesUiSlice,
  peersSlice,
  mapSlice,
  mapSelectionSlice,
);

export type RootState = ReturnType<typeof slices>;
const slicesWithActions = withActions(
  slices,
  gameFactoriesActions,
  solverFactoriesActions,
  gameRemoteActions,
  gameRealtimeActions,
  factoryViewSortActions,
);

export const useStore = create(
  devtools(
    persist(slicesWithActions, {
      name: 'zustand:persist',
      partialize: state => omit(state, ['gameSave', 'peers', 'mapSelection']),
      version: 8,
      storage: forceMigrationOnInitialPersist(
        createJSONStorage(() => indexedDbStorage),
      ),
      onRehydrateStorage: () => state => {
        logger.info('Rehydrated storage');
        if (state) {
          // Backfill any missing map-slice fields. Earlier shapes of
          // this slice shipped without `resourceFilters` /
          // `hideUsedNodes` / `collectibleVisibility` /
          // `hideCollectedCollectibles`, and zustand's default shallow
          // merge leaves those stale shapes as-is on rehydrate.
          const mapState = (state as unknown as { map?: Partial<MapSlice> })
            .map;
          if (mapState) {
            const defaults = initialMapSliceState();
            if (!mapState.resourceFilters)
              mapState.resourceFilters = defaults.resourceFilters;
            if (typeof mapState.hideUsedNodes !== 'boolean')
              mapState.hideUsedNodes = defaults.hideUsedNodes;
            if (!mapState.collectibleVisibility) {
              mapState.collectibleVisibility = defaults.collectibleVisibility;
            } else {
              for (const [type, on] of Object.entries(
                defaults.collectibleVisibility,
              )) {
                if (
                  typeof mapState.collectibleVisibility[
                    type as keyof typeof defaults.collectibleVisibility
                  ] !== 'boolean'
                ) {
                  mapState.collectibleVisibility[
                    type as keyof typeof defaults.collectibleVisibility
                  ] = on;
                }
              }
            }
            if (typeof mapState.hideCollectedCollectibles !== 'boolean')
              mapState.hideCollectedCollectibles =
                defaults.hideCollectedCollectibles;
          } else {
            (state as unknown as { map: MapSlice }).map =
              initialMapSliceState();
          }
          state.setHasRehydratedLocalData(true);
        }
      },
      migrate: (state, version) => {
        if (version === 0) {
          if (localStorage.getItem('zustand:persist')) {
            logger.log('Migrating from version 0 to 1 [indexedDB]');
            const previous = localStorage.getItem('zustand:persist');
            if (!previous) return { ...(state as any), version: 1 };
            try {
              const parsed = JSON.parse(previous);

              logger.log('Migrating from previous localStorage..');
              return { ...(state as any), ...parsed?.state, version: 1 };
            } catch (e) {
              logger.error('Error migrating from version 0 to 1', e);
            }
          } else {
            logger.log('Migrating from version 0 to 1', state);
            const migrated = migratePersistedStoreFromRedux();
            logger.log('Migrated to:', migrated);
            if (migrated) {
              return { ...(state as any), ...(migrated as any), version: 1 };
            }
          }
        }

        if (version === 1) {
          logger.log('Migrating from version 1 to 2');
          return migrateStoreWithPlan(storeMigrationV2, state as any);
        }

        if (version === 2) {
          logger.log('Migrating from version 2 to 3');
          return removeMissingFactoriesInGames(state as any);
        }

        if (version === 3) {
          logger.log('Migrating from version 3 to 4 [kanban]');
          return migrateStoreWithPlan(storeMigrationV4, state as any, draft => {
            draft.factoryView.viewMode = 'grid';
          });
        }

        if (version === 4) {
          logger.log('Migrating from version 4 to 5 [map slice reshape]');
          // The map slice changed shape (per-resource purity filters,
          // used-node tracking). Replace the old slice wholesale with
          // the new default. We can't rely on the persist middleware's
          // shallow merge to fill in missing keys — it overwrites the
          // base `map` slice with whatever the persisted state had.
          return {
            ...(state as any),
            map: initialMapSliceState(),
          };
        }

        if (version === 5) {
          logger.log(
            'Migrating from version 5 to 6 [add collectibles to map slice]',
          );
          // v6 introduced `collectibleVisibility` and
          // `hideCollectedCollectibles` on the map slice. Backfill
          // them while keeping the player's existing resource filters
          // intact — those are real choices we don't want to reset.
          // (Earlier revisions also seeded `collectedByGame` here; v8
          // removed that field entirely so we no longer touch it.)
          const defaults = initialMapSliceState();
          const previous = (state as { map?: Partial<MapSlice> }).map;
          return {
            ...(state as any),
            map: {
              ...defaults,
              ...(previous ?? {}),
              collectibleVisibility:
                previous?.collectibleVisibility ??
                defaults.collectibleVisibility,
              hideCollectedCollectibles:
                typeof previous?.hideCollectedCollectibles === 'boolean'
                  ? previous.hideCollectedCollectibles
                  : defaults.hideCollectedCollectibles,
            },
          };
        }

        if (version === 6) {
          logger.log(
            'Migrating from version 6 to 7 [collectibles default to hidden]',
          );
          // v7 changes the collectible visibility default from all-on
          // to all-off — there are ~1.7k collectible markers and they
          // visually drown out the resource layer. Reset everyone's
          // visibility so they get the new opt-in UX. Collected marks
          // and the hide-collected toggle stay intact.
          const defaults = initialMapSliceState();
          const previous = (state as { map?: Partial<MapSlice> }).map;
          return {
            ...(state as any),
            map: {
              ...defaults,
              ...(previous ?? {}),
              collectibleVisibility: defaults.collectibleVisibility,
            },
          };
        }

        if (version === 7) {
          logger.log(
            'Migrating from version 7 to 8 [used/collected marks moved onto Game]',
          );
          // v8 moves per-game node "used" and collectible "collected"
          // marks off the map slice and onto each Game (so they sync
          // and save with the game). Existing local-only marks are
          // intentionally dropped — they were view-state in practice
          // and most users hadn't accumulated meaningful sets yet.
          const previous = (state as { map?: Partial<MapSlice> }).map;
          if (previous) {
            const next = { ...previous } as Partial<MapSlice> & {
              usedNodesByGame?: unknown;
              collectedByGame?: unknown;
            };
            delete next.usedNodesByGame;
            delete next.collectedByGame;
            return {
              ...(state as any),
              map: next,
            };
          }
          return state;
        }

        return state;
      },
    }),
  ),
);

export const useShallowStore = <T>(selector: (state: RootState) => T) =>
  useStore(useShallow(selector));
