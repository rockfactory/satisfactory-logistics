import { create } from 'zustand';
import { withActions, withSlices } from 'zustand-slices';
import { factoriesSlice } from '../factories/store/factoriesSlice';
import { gamesSlice } from '../games/gamesSlice';
export const useStore = create(
  withActions(withSlices(gamesSlice, factoriesSlice), {}),
);
