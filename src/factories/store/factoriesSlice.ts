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
      fn(state.factories[id]);
    },
    addFactory: (factory: Factory) => state => {
      state.factories[factory.id] = factory;
    },
    createFactory:
      (id: string, factory?: Partial<Omit<Factory, 'id'>>) => state => {
        state.factories[id] = {
          inputs: [],
          outputs: [],
          ...factory,
          id,
        };
      },
  },
});

export const useFactory = (id: string | null | undefined) =>
  useStore(state => (id ? state.factories.factories[id] : null));
