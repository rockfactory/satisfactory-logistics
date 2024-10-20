import { PersistStorage, StorageValue } from 'zustand/middleware';

export function forceMigrationOnInitialPersist<S>(
  originalStorage: PersistStorage<S> | undefined,
): PersistStorage<S> | undefined {
  try {
    if (!originalStorage) {
      return undefined;
    }
    const modifiedStorage: PersistStorage<S> = {
      getItem: async name => {
        const item = await originalStorage.getItem(name);
        if (item) {
          return item;
        }
        return {
          state: undefined,
          version: 0,
        } as StorageValue<S>;
      },
      setItem: originalStorage.setItem,
      removeItem: originalStorage.removeItem,
    };
    return modifiedStorage;
  } catch (e) {
    console.error('forceMigrationOnInitialPersist', e);
    return undefined;
  }
}
