export interface FactoryBuilding {
  id: string;
  name: string;
  index: number;
  description: string;
  powerConsumption: number;
  minimumPowerConsumption: number | null;
  maximumPowerConsumption: number | null;
  averagePowerConsumption: number;
  powerConsumptionExponent: number;
  somersloopPowerConsumptionExponent: number;
  somersloopSlots: number;
  clearance: {
    width: number;
    length: number;
    height: number;
  };
  conveyor: {
    isBelt: boolean;
    speed: number;
  } | null;
  imagePath: string;
  powerGenerator: PowerGenerator | null;
  extractor: Extractor | null;
}

interface Fuel {
  resource: string;
  byproductAmount?: number;
}

interface PowerGenerator {
  fuels: Fuel[];
  powerProduction: number;
  supplementalLoadAmount: number;
  fuelLoadAmount: number;
  requiresSupplementalResource: boolean;
}

interface Extractor {
  type: string;
  allowedForms: FactoryItemForm[];
  allowedResources: string[];
  itemsPerCycle: number;
  cycleTime: number;
  itemsPerMinute: number;
}

import { sortBy } from 'lodash';
import RawFactoryBuildings from './FactoryBuildings.json';
import type { FactoryItemForm } from './FactoryItem';
export const AllFactoryBuildings: FactoryBuilding[] =
  RawFactoryBuildings as FactoryBuilding[];

export const AllFactoryBuildingsMap = AllFactoryBuildings.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<string, FactoryBuilding>,
);

export function getFactoryBuildingByName(name: string) {
  return AllFactoryBuildings.find(b => b.name === name);
}

export const FactoryConveyorBelts = sortBy(
  AllFactoryBuildings.filter(building => building.conveyor?.isBelt),
  'name',
);
