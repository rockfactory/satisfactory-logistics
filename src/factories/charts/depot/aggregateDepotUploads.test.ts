import { describe, expect, test } from 'vitest';
import type { Factory } from '@/factories/Factory';
import { aggregateDepotUploads } from './aggregateDepotUploads';

const make = (overrides: Partial<Factory>): Factory => ({
  id: 'f1',
  name: 'Plates Plant',
  inputs: [],
  outputs: [],
  ...overrides,
});

describe('aggregateDepotUploads', () => {
  test('returns empty when no factory uploads to depot', () => {
    expect(
      aggregateDepotUploads([
        make({
          outputs: [{ resource: 'Desc_IronPlate_C', amount: 100 }],
        }),
      ]),
    ).toEqual([]);
  });

  test('aggregates depot outputs across factories per resource', () => {
    const result = aggregateDepotUploads([
      make({
        id: 'a',
        name: 'A',
        outputs: [
          { resource: 'Desc_IronPlate_C', amount: 60, destination: 'depot' },
          { resource: 'Desc_IronPlate_C', amount: 40 }, // local, not counted
        ],
      }),
      make({
        id: 'b',
        name: 'B',
        outputs: [
          { resource: 'Desc_IronPlate_C', amount: 25, destination: 'depot' },
        ],
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].resource).toBe('Desc_IronPlate_C');
    expect(result[0].totalAmount).toBe(85);
    expect(result[0].sources).toEqual([
      { id: 'a', name: 'A', amount: 60 },
      { id: 'b', name: 'B', amount: 25 },
    ]);
  });

  test('skips disabled factories and unnamed entries', () => {
    const result = aggregateDepotUploads([
      make({
        id: 'a',
        name: 'A',
        progress: 'disabled',
        outputs: [
          { resource: 'Desc_IronPlate_C', amount: 60, destination: 'depot' },
        ],
      }),
      make({
        id: 'b',
        name: null,
        outputs: [
          { resource: 'Desc_IronPlate_C', amount: 60, destination: 'depot' },
        ],
      }),
    ]);

    expect(result).toEqual([]);
  });

  test('skips depot rows with missing resource or amount', () => {
    const result = aggregateDepotUploads([
      make({
        id: 'a',
        name: 'A',
        outputs: [
          { resource: null, amount: 10, destination: 'depot' },
          { resource: 'Desc_IronPlate_C', amount: 0, destination: 'depot' },
        ],
      }),
    ]);

    expect(result).toEqual([]);
  });
});
