import { original } from 'immer';
import { useStore } from '../../core/zustand';
import { createSlice } from '../../core/zustand-helpers/slices';
import { Factory } from '../Factory';
interface FactoriesSlice {
  factories: Record<string, Factory>;
}

export const factoriesSlice = createSlice({
  name: 'factories',
  value: {
    factories: {},
  } as FactoriesSlice,
  actions: {
    updateFactory: (id: string, fn: (factory: Factory) => void) => state => {
      console.log('updateFactory', id, original(state.factories[id]));
      fn(state.factories[id]);
    },
    addFactory: (factory: Factory) => state => {
      state.factories[factory.id] = factory;
    },
  },
});

export const useFactory = (id: string | null | undefined) =>
  useStore(state => (id ? state.factories.factories[id] : null));
