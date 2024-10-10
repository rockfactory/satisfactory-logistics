import { createSliceWithImmer } from 'zustand-slices/immer';
import { Factory } from '../Factory';

export const factoriesSlice = createSliceWithImmer({
  name: 'factories',
  value: {
    factories: {} as Record<string, Factory>,
  },
  actions: {},
});
