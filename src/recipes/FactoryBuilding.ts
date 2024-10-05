export interface FactoryBuilding {
  id: string;
  name: string;
  index: number;
  description: string;
  powerConsumption: number;
  powerConsumptionExponent: number;
  somersloopPowerConsumptionExponent: number;
  clearanceData: string; // TODO parse this
  imagePath: string;
}

import RawFactoryBuildings from './FactoryBuildings.json';
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
