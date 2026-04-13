import { useStore } from '@/core/zustand';
import { createSlice } from '@/core/zustand-helpers/slices';
import { Factory } from '@/factories/Factory';
interface FactoriesSlice {
  factories: Record<string, Factory>;
}

export const factoriesSlice = createSlice({
  name: 'factories',
  value: {
    factories: {},
  } as FactoriesSlice,
  actions: {
    updateFactories: (fn: (factory: Factory) => void) => state => {
      Object.values(state.factories).forEach(factory => fn(factory));
    },
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
          progress: 'draft',
        };
      },
    updateFactoryInputAmount:
      (factoryId: string, inputIndex: number, amount: number) => state => {
        state.factories[factoryId].inputs[inputIndex].amount = amount;
      },
    updateFactoryOutputAmount:
      (factoryId: string, outputIndex: number, amount: number) => state => {
        state.factories[factoryId].outputs[outputIndex].amount = amount;
      },
    setFactoryAllowedBuildings:
      (factoryId: string, allowedBuildings: string[] | null) => state => {
        state.factories[factoryId].allowedBuildings = allowedBuildings;
      },
    toggleFactoryBuilding:
      (factoryId: string, buildingId: string, enabled?: boolean) => state => {
        const factory = state.factories[factoryId];
        if (!factory) return;

        // Initialize with empty array if not set
        if (
          factory.allowedBuildings === undefined ||
          factory.allowedBuildings === null
        ) {
          factory.allowedBuildings = [];
        }

        const index = factory.allowedBuildings.indexOf(buildingId);
        const shouldAdd = enabled ?? index === -1;

        if (shouldAdd && index === -1) {
          factory.allowedBuildings.push(buildingId);
        } else if (!shouldAdd && index !== -1) {
          factory.allowedBuildings.splice(index, 1);
        }
      },
  },
});

export const useFactory = (id: string | null | undefined) =>
  useStore(state => (id ? state.factories.factories[id] : null));
