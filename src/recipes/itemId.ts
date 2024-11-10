import type { FactoryItemId } from './FactoryItemId';

export function itemId<T extends FactoryItemId>(id: T): T {
  return id;
}
