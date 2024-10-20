import { factoryViewSortActions } from '@/factories/store/factoryViewSortActions';
import { gameSaveSlice } from '@/games/save/gameSaveSlice';
import { gameRemoteActions } from '@/games/store/gameRemoteActions';
import { omit } from 'lodash';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import { authSlice } from '../auth/authSlice';
import { factoriesSlice } from '../factories/store/factoriesSlice';
import { factoryViewSlice } from '../factories/store/factoryViewSlice';
import { gamesSlice } from '../games/gamesSlice';
import { gameFactoriesActions } from '../games/store/gameFactoriesActions';
import { solverFactoriesActions } from '../solver/store/solverFactoriesActions';
import { solversSlice } from '../solver/store/solverSlice';
import { migratePersistedStoreFromRedux } from './migrations/migratePersistedStoreFromRedux';
import { withActions } from './zustand-helpers/actions';
import { forceMigrationOnInitialPersist } from './zustand-helpers/forceMigrationOnInitialPersist';
import { withSlices } from './zustand-helpers/slices';

const slices = withSlices(
  authSlice,
  gamesSlice,
  gameSaveSlice,
  factoriesSlice,
  factoryViewSlice,
  solversSlice,
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
      version: 1,
      storage: forceMigrationOnInitialPersist(
        createJSONStorage(() => localStorage),
      ),
      migrate: (state, version) => {
        if (version === 0) {
          console.log('Migrating from version 0 to 1', state);
          const migrated = migratePersistedStoreFromRedux();
          console.log('Migrated to:', migrated);
          if (migrated) {
            return { ...(state as any), ...(migrated as any), version: 1 };
          }
        }

        return state;
      },
    }),
  ),
);

export const useShallowStore = <T>(selector: (state: RootState) => T) =>
  useStore(useShallow(selector));
