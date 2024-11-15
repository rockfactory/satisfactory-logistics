import fs from 'fs';
import voca from 'voca';
import { convertImageName } from './images/convertImageName';
import { parseClearanceData } from './parseClearanceData';
import { ParsingContext } from './ParsingContext';

export function parseBuildings(docsJson: any) {
  const rawBuildings = docsJson.flatMap(nativeClass => {
    if (
      nativeClass.NativeClass?.includes('FGBuildableManufacturer') ||
      nativeClass.NativeClass?.includes('FGBuildableGenerator') ||
      nativeClass.NativeClass?.includes('FGBuildableWaterPump') ||
      nativeClass.NativeClass?.includes('FGBuildableResourceExtractor') ||
      nativeClass.NativeClass?.includes('FGBuildableFrackingExtractor') ||
      nativeClass.NativeClass?.includes('FGBuildablePipeline') ||
      nativeClass.NativeClass?.includes('FGBuildableConveyorBelt')
    )
      return nativeClass.Classes.map(c => ({
        ...c,
        NativeClass: nativeClass.NativeClass,
      }));
    return [];
  });

  const buildingDescriptorsImages = docsJson
    .flatMap(nativeClass => {
      if (nativeClass.NativeClass?.includes('FGBuildingDescriptor'))
        return nativeClass.Classes;
      return [];
    })
    .reduce((acc, desc) => {
      acc[desc.ClassName] = desc.mPersistentBigIcon;
      return acc;
    }, {});

  const buildings = rawBuildings
    .map((building, index) =>
      parseBuilding(building, index, buildingDescriptorsImages),
    )
    .filter(Boolean);

  ParsingContext.buildings = buildings;

  fs.writeFileSync(
    './src/recipes/FactoryBuildings.json',
    JSON.stringify(buildings, null, 2),
  );
}

function parseBuilding(building, index, buildingDescriptorsImages) {
  console.log(`Importing -> `, building.ClassName);

  const minimumPowerConsumption = building.mEstimatedMininumPowerConsumption
    ? parseFloat(building.mEstimatedMininumPowerConsumption)
    : null;
  const maximumPowerConsumption = building.mEstimatedMaximumPowerConsumption
    ? parseFloat(building.mEstimatedMaximumPowerConsumption)
    : null;
  const powerConsumption = parseFloat(building.mPowerConsumption);

  return {
    id: building.ClassName,
    name: building.mDisplayName,
    index,
    description: building.mDescription,
    minimumPowerConsumption: minimumPowerConsumption,
    maximumPowerConsumption: maximumPowerConsumption,
    averagePowerConsumption:
      minimumPowerConsumption && maximumPowerConsumption
        ? (minimumPowerConsumption + maximumPowerConsumption) / 2
        : powerConsumption,
    powerConsumption,
    powerConsumptionExponent: parseFloat(building.mPowerConsumptionExponent),
    somersloopPowerConsumptionExponent: parseFloat(
      building.mProductionBoostPowerConsumptionExponent,
    ),
    // Fix for smelters
    somersloopSlots:
      building.ClassName === 'Build_SmelterMk1_C'
        ? 1.0
        : parseFloat(building.mProductionShardSlotSize),
    clearance: parseClearanceData(building.mClearanceData),
    imagePath:
      '/images/game/' +
      convertImageName(
        buildingDescriptorsImages[
          building.ClassName.replace('Build_', 'Desc_')
        ],
      ),
    conveyor: parseBuildingBelt(building),
    pipeline: parseBuildingsPipeline(building),
    extractor: parseBuildingExtractor(building),
    powerGenerator: building.mFuel
      ? {
          fuels: building.mFuel.map(fuel => {
            return {
              resource: fuel.mFuelClass,
              supplementalResource: fuel.mSupplementalFuelClass,
              byproductResource: fuel.mByproductClass,
              byproductAmount: fuel.mByproductAmount
                ? parseFloat(fuel.mByproductAmount)
                : undefined,
            };
          }),
          powerProduction: parseFloat(building.mPowerProduction),
          supplementalLoadAmount: parseFloat(building.mSupplementalLoadAmount),
          fuelLoadAmount: parseFloat(building.mFuelLoadAmount),
          requiresSupplementalResource:
            building.mRequiresSupplementalResource === 'True',
        }
      : undefined,
  };
}

function parseBuildingBelt(building) {
  if (!building.NativeClass.includes('FGBuildableConveyorBelt')) return null;
  return {
    isBelt: building.NativeClass.includes('FGBuildableConveyorBelt'),
    speed: parseFloat(building.mSpeed) / 2.0, // Don't know why, but the speed is doubled
  };
}

function parseBuildingsPipeline(building) {
  if (!building.NativeClass.includes('FGBuildablePipeline')) return null;
  return {
    isPipeline: building.NativeClass.includes('FGBuildablePipeline'),
    flowRate: parseFloat(building.mFlowLimit) * 60,
  };
}

const ResourceRegex = /\.(Desc_\w+)/g;

function parseBuildingExtractor(building) {
  if (!building.mExtractorTypeName) return null;

  const isSolid = building.mAllowedResourceForms === '(RF_SOLID)';
  let itemsPerCycle = parseFloat(building.mItemsPerCycle);
  if (!isSolid) {
    itemsPerCycle = itemsPerCycle / 1_000;
  }

  console.log(`Importing -> `, building.ClassName);
  return {
    type: building.mExtractorTypeName,
    // (RF_LIQUID,RF_GAS)" -> ["Liquid", "Gas"]
    allowedForms: building.mAllowedResourceForms
      .match(/RF_(\w+)/g)
      .map(f => voca.capitalize(f.replace('RF_', '').toLowerCase())),
    allowedResources:
      building.mOnlyAllowCertainResources === 'False'
        ? null
        : building.mAllowedResources
            .match(ResourceRegex)
            .map(r => r.replace('.', '')),
    itemsPerCycle: itemsPerCycle,
    cycleTime: parseFloat(building.mExtractCycleTime),
    itemsPerMinute:
      (itemsPerCycle / parseFloat(building.mExtractCycleTime)) * 60,
  };
}
