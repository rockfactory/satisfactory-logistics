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
}

// eslint-disable-next-line react-refresh/only-export-components
export enum FactoryItemForm {
  Solid = 'Solid',
  Liquid = 'Liquid',
  Gas = 'Gas',
}

import { IconBolt } from '@tabler/icons-react';
import type React from 'react';
import RawFactoryItems from './FactoryItems.json';

export const AllFactoryItems: FactoryItem[] = RawFactoryItems as FactoryItem[];

AllFactoryItems.push({
  imagePath: '',
  id: 'Cust_Power',
  index: -10,
  name: 'Power',
  displayName: 'Power',
  description: 'Power',
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

export const AllFactoryItemsMap = AllFactoryItems.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<string, FactoryItem>,
);
