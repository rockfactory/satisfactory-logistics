export interface FactoryItem {
  id: string;
  index: number;
  name: string;
  displayName: string;
  description: string;
  form: FactoryItemForm;
  sinkPoints: number;
  sinkable: boolean;
  energyValue: number;
  radioactiveDecay: number;
  canBeDiscarded: boolean;
  color: string;
  imagePath: string;
  imageComponent?: React.ComponentType<{ size: number | string | undefined }>;
  unit?: string;
  isFicsmas: boolean;
  isVechicle?: boolean;
}

export enum FactoryItemForm {
  Solid = 'Solid',
  Liquid = 'Liquid',
  Gas = 'Gas',
  // Not valid
  Invalid = 'Invalid',
}

import { IconBolt } from '@tabler/icons-react';
import type { FactoryItemId } from './FactoryItemId';
import RawFactoryItems from './FactoryItems.json';

/**
 * Reserved static index for the custom Power item.
 * The parser must skip this index when assigning new items.
 */
export const POWER_ITEM_INDEX = 176;

export const AllFactoryItems: FactoryItem[] = RawFactoryItems as FactoryItem[];
AllFactoryItems.push({
  imagePath: '',
  id: 'Desc_Power_CX',
  index: POWER_ITEM_INDEX,
  name: 'Power',
  displayName: 'Power',
  description: 'Power',
  // If it's invalid, it _cannot_ be produced.
  form: FactoryItemForm.Solid,
  sinkPoints: 0,
  sinkable: false,
  energyValue: 0,
  radioactiveDecay: 0,
  canBeDiscarded: false,
  color: '#000000',
  isFicsmas: false,
  unit: 'MW',
  imageComponent: IconBolt,
});

// Post-processing

export const AllProducibleFactoryItems = AllFactoryItems.filter(
  item => item.form !== FactoryItemForm.Invalid,
);

export const AllFactoryItemsMap = AllFactoryItems.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<string, FactoryItem>,
);

export function getFactoryItem(id: FactoryItemId): FactoryItem {
  const item = AllFactoryItemsMap[id];
  if (!item) {
    throw new Error(`Factory item with id "${id}" not found`);
  }
  return item;
}
