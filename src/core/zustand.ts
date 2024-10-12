import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import { authSlice } from '../auth/authSlice';
import { factoryViewSlice } from '../factories/factoryViewSlice';
import { factoriesSlice } from '../factories/store/factoriesSlice';
import { gamesSlice } from '../games/gamesSlice';
import { gameFactoriesActions } from '../games/store/gameFactoriesActions';
import { solverFactoriesActions } from '../solver/store/solverFactoriesActions';
import { solversSlice } from '../solver/store/solverSlice';
import { withActions } from './zustand-helpers/actions';
import { withSlices } from './zustand-helpers/slices';

const slices = withSlices(
  authSlice,
  gamesSlice,
  factoriesSlice,
  factoryViewSlice,
  solversSlice,
);

export type RootState = ReturnType<typeof slices>;
const slicesWithActions = withActions(
  slices,
  gameFactoriesActions,
  solverFactoriesActions,
);

export const useStore = create(devtools(slicesWithActions));

export const useShallowStore = <T>(selector: (state: RootState) => T) =>
  useStore(useShallow(selector));
