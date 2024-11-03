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

// eslint-disable-next-line react-refresh/only-export-components
export enum FactoryItemForm {
  Solid = 'Solid',
  Liquid = 'Liquid',
  Gas = 'Gas',
  // Not valid
  Invalid = 'Invalid',
}

import { IconBolt } from '@tabler/icons-react';
import { last } from 'lodash';
import type React from 'react';
import type { FactoryItemId } from './FactoryItemId';
import RawFactoryItems from './FactoryItems.json';

export const AllFactoryItems: FactoryItem[] = RawFactoryItems as FactoryItem[];
AllFactoryItems.push({
  imagePath: '',
  id: 'Desc_Power_CX',
  index: last(AllFactoryItems)!.index + 1,
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

// eslint-disable-next-line react-refresh/only-export-components
export function getFactoryItem(id: FactoryItemId): FactoryItem {
  const item = AllFactoryItemsMap[id];
  if (!item) {
    throw new Error(`Factory item with id "${id}" not found`);
  }
  return item;
}
