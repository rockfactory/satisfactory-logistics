import { createSlice } from '../../core/zustand';
import { Factory } from '../Factory';

export const factoriesSlice = createSlice({
  name: 'factories',
  value: {
    factories: {} as Record<string, Factory>,
  },
  actions: {
    addFactory: (factory: Factory) => state => {
      state.factories[factory.id] = factory;
    },
  },
});
