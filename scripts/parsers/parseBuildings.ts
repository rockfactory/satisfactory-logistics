import fs from 'fs';
import sortBy from 'lodash/sortBy';
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
      nativeClass.NativeClass?.includes('FGBuildablePolePipe') ||
      nativeClass.NativeClass?.includes('FGBuildablePoleStackable') ||
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

  const buildCostMap = parseBuildCosts(docsJson);

  const previousBuildings = JSON.parse(
    fs.readFileSync('./src/recipes/FactoryBuildings.json').toString(),
  );
  const previousBuildingsIndexes = previousBuildings.reduce((acc, b) => {
    acc[b.id] = b.index;
    return acc;
  }, {} as Record<string, number>);

  let nextIndex = previousBuildings.length;

  const buildings = sortBy(
    rawBuildings
      .map(building => {
        const index =
          previousBuildingsIndexes[building.ClassName] != null
            ? previousBuildingsIndexes[building.ClassName]
            : nextIndex++;
        return parseBuilding(building, index, buildingDescriptorsImages, buildCostMap);
      })
      .filter(Boolean),
    'index',
  );

  ParsingContext.buildings = buildings;

  fs.writeFileSync(
    './src/recipes/FactoryBuildings.json',
    JSON.stringify(buildings, null, 2),
  );
}

const BuildCostIngredientRegex =
  /\(ItemClass=(?:[^)]*)\.([^']*)(?:[^)]*)Amount=([\d.]+)\)/gm;

/**
 * Extracts building costs from BuildGun recipes.
 * These are recipes whose mProducedIn includes BP_BuildGun and whose
 * mProduct references a Desc_ class that maps to a Build_ building.
 */
function parseBuildCosts(docsJson: any) {
  const costMap: Record<string, Array<{ resource: string; amount: number }>> =
    {};

  const allRecipes = docsJson.flatMap(nativeClass => {
    if (nativeClass.NativeClass?.includes('FGRecipe')) {
      return nativeClass.Classes;
    }
    return [];
  });

  for (const recipe of allRecipes) {
    if (!recipe.mProducedIn?.includes('BuildGun')) continue;

    const productMatch = recipe.mProduct?.match(/\.([^']*_C)/);
    if (!productMatch) continue;

    const descId = productMatch[1];
    const buildId = descId.replace('Desc_', 'Build_');

    const ingredients = [
      ...recipe.mIngredients.matchAll(BuildCostIngredientRegex),
    ];
    if (ingredients.length === 0) continue;

    costMap[buildId] = ingredients.map(([_, resource, amount]) => ({
      resource,
      amount: parseFloat(amount),
    }));
  }

  return costMap;
}

function parseBuilding(building, index, buildingDescriptorsImages, buildCostMap) {
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
    buildCost: buildCostMap[building.ClassName] ?? [],
    powerGenerator: parsePowerGenerator(building),
  };
}

function parsePowerGenerator(building) {
  if (!building.NativeClass?.includes('FGBuildableGenerator')) return undefined;

  const fuels = (building.mFuel ?? []).map(fuel => ({
    resource: fuel.mFuelClass,
    supplementalResource: fuel.mSupplementalFuelClass,
    byproductResource: fuel.mByproductClass,
    byproductAmount: fuel.mByproductAmount
      ? parseFloat(fuel.mByproductAmount)
      : undefined,
  }));

  const basePowerProduction = parseFloat(building.mPowerProduction);
  const variableFactor = building.mVariablePowerProductionFactor
    ? parseFloat(building.mVariablePowerProductionFactor)
    : 0;
  // Fuel-less generators (e.g. Geothermal) report mPowerProduction=0 and
  // model output via mVariablePowerProductionFactor (the cycle average).
  const powerProduction =
    basePowerProduction > 0 ? basePowerProduction : variableFactor;

  return {
    fuels,
    powerProduction,
    supplementalLoadAmount: parseFloat(
      building.mSupplementalLoadAmount ?? '0',
    ),
    fuelLoadAmount: parseFloat(building.mFuelLoadAmount ?? '0'),
    requiresSupplementalResource:
      building.mRequiresSupplementalResource === 'True',
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
