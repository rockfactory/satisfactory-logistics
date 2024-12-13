import { authSlice } from '@/auth/authSlice';
import { chartsSlice } from '@/factories/charts/store/chartsSlice';
import { factoriesSlice } from '@/factories/store/factoriesSlice';
import { factoryViewSlice } from '@/factories/store/factoryViewSlice';
import { factoryViewSortActions } from '@/factories/store/factoryViewSortActions';
import { gamesSlice } from '@/games/gamesSlice';
import { gameSaveSlice } from '@/games/save/gameSaveSlice';
import { gameFactoriesActions } from '@/games/store/gameFactoriesActions';
import { gameRemoteActions } from '@/games/store/gameRemoteActions';
import { solverFactoriesActions } from '@/solver/store/solverFactoriesActions';
import { solversSlice } from '@/solver/store/solverSlice';
import { omit } from 'lodash';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import { loglev } from './logger/log';
import { migratePersistedStoreFromRedux } from './migrations/migratePersistedStoreFromRedux';
import { migrateStoreWithPlan } from './migrations/planner/StoreMigrationPlan';
import { removeMissingFactoriesInGames } from './migrations/removeMissingFactoriesInGames';
import { storeMigrationV2 } from './migrations/v2';
import { withActions } from './zustand-helpers/actions';
import { forceMigrationOnInitialPersist } from './zustand-helpers/forceMigrationOnInitialPersist';
import { indexedDbStorage } from './zustand-helpers/indexedDbStorage';
import { withSlices } from './zustand-helpers/slices';
import { markFactoriesAsDone } from '@/core/migrations/markFactoriesAsDone';

const logger = loglev.getLogger('store:zustand');

const slices = withSlices(
  authSlice,
  gamesSlice,
  gameSaveSlice,
  factoriesSlice,
  factoryViewSlice,
  solversSlice,
  chartsSlice,
);

export type RootState = ReturnType<typeof slices>;
const slicesWithActions = withActions(
  slices,
  gameFactoriesActions,
  solverFactoriesActions,
  gameRemoteActions,
  factoryViewSortActions,
);

export const useStore = create(
  devtools(
    persist(slicesWithActions, {
      name: 'zustand:persist',
      partialize: state => omit(state, ['gameSave']),
      version: 4,
      storage: forceMigrationOnInitialPersist(
        createJSONStorage(() => indexedDbStorage),
      ),
      onRehydrateStorage: () => state => {
        logger.info('Rehydrated storage');
        state?.setHasRehydratedLocalData(true);
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
          logger.log('Migrating from version 3 to 4');

          return markFactoriesAsDone(state as any);
        }

        return state;
      },
    }),
  ),
);

export const useShallowStore = <T>(selector: (state: RootState) => T) =>
  useStore(useShallow(selector));
