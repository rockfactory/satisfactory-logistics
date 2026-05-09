import type { Factory } from '@/factories/Factory';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';

export interface DepotRow {
  resource: string;
  totalAmount: number;
  sources: Array<{ id: string; name: string; amount: number }>;
}

export function aggregateDepotUploads(factories: Factory[]): DepotRow[] {
  const byResource = new Map<string, DepotRow>();

  for (const factory of factories) {
    if (!factory.name || factory.progress === 'disabled') continue;
    for (const output of factory.outputs ?? []) {
      if (output.destination !== 'depot') continue;
      if (!output.resource || !output.amount) continue;

      let row = byResource.get(output.resource);
      if (!row) {
        row = { resource: output.resource, totalAmount: 0, sources: [] };
        byResource.set(output.resource, row);
      }
      row.totalAmount += output.amount;
      // Merge multiple depot rows of the same resource on the same factory
      // into a single source entry, so consumers can use `source.id` as a
      // stable React key without collisions.
      const existingSource = row.sources.find(s => s.id === factory.id);
      if (existingSource) {
        existingSource.amount += output.amount;
      } else {
        row.sources.push({
          id: factory.id,
          name: factory.name,
          amount: output.amount,
        });
      }
    }
  }

  return Array.from(byResource.values()).sort((a, b) => {
    const aName = AllFactoryItemsMap[a.resource]?.displayName ?? a.resource;
    const bName = AllFactoryItemsMap[b.resource]?.displayName ?? b.resource;
    return aName.localeCompare(bName);
  });
}
