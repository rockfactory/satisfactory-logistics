import fs from 'fs';
import kebabCase from 'lodash/kebabCase';
import sortBy from 'lodash/sortBy';
import voca from 'voca';
import { convertImageName } from './images/convertImageName';
import { parseClearanceData } from './parseClearanceData';
import { ParsingContext } from './ParsingContext';

// Native classes whose buildings should appear in the codex. Manufacturers,
// generators, and the original logistics types were always here. The rest
// were added so milestone "unlocks" entries (railway signalling, drones,
// blueprint designer, hypertubes, conveyor lifts, splitters/mergers, etc.)
// resolve to real building cards instead of falling back to "Other unlocks".
// Pure decoration / structural primitives (foundations, ramps, walls, beams,
// signs, lights, doors) are intentionally omitted, the codex is for
// production planning not construction kit cataloguing.
const INCLUDED_BUILDABLE_NATIVE_CLASSES = [
  // Production
  'FGBuildableManufacturer',
  'FGBuildableManufacturerVariablePower',
  'FGBuildableFactorySimpleProducer',
  'FGBuildableGenerator',
  'FGBuildableGeneratorFuel',
  'FGBuildableGeneratorNuclear',
  'FGBuildableGeneratorGeoThermal',
  // Extraction
  'FGBuildableWaterPump',
  'FGBuildableResourceExtractor',
  'FGBuildableFrackingExtractor',
  'FGBuildableFrackingActivator',
  // Pipes
  'FGBuildablePipeline',
  'FGBuildablePolePipe',
  'FGBuildablePoleStackable',
  'FGBuildablePipelineJunction',
  'FGBuildablePipelinePump',
  'FGBuildablePipeReservoir',
  // Hypertubes
  'FGBuildablePipeHyper',
  'FGBuildablePipeHyperJunction',
  // Conveyors and storage
  'FGBuildableConveyorBelt',
  'FGBuildableConveyorLift',
  'FGBuildableStorage',
  'FGBuildableAttachmentSplitter',
  'FGBuildableAttachmentMerger',
  'FGBuildableSplitterSmart',
  'FGBuildableMergerPriority',
  // Power
  'FGBuildablePowerStorage',
  'FGBuildablePowerPole',
  'FGBuildablePowerBooster',
  'FGBuildableCircuitSwitch',
  'FGBuildablePriorityPowerSwitch',
  // Trains
  'FGBuildableRailroadTrack',
  'FGBuildableRailroadStation',
  'FGBuildableRailroadSignal',
  'FGBuildableRailroadAttachment',
  'FGBuildableTrainPlatformCargo',
  'FGBuildableTrainPlatformEmpty',
  // Vehicles
  'FGBuildableDockingStation',
  'FGBuildableDroneStation',
  // Misc gameplay structures
  'FGBuildableTradingPost',
  'FGBuildableMAM',
  'FGBuildableRadarTower',
  'FGBuildableJumppad',
  'FGBuildablePortal',
  'FGBuildablePortalSatellite',
  'FGBuildableBlueprintDesigner',
  'FGBuildableResourceSink',
  'FGBuildableResourceSinkShop',
  'FGBuildableSpaceElevator',
  // Two-entry groups it's fine to take wholesale.
  'FGBuildableFactory', // Old Jump Pad, Old Tilted Jump Pad, U-Jelly Landing Pad
  'FGBuildablePolePipe', // Pipeline Support, Hypertube Support
];

// Specific buildings to include even though their native class isn't in the
// allowlist above. These are gameplay-relevant entries that live in catch-all
// or near-empty native classes we don't want to import wholesale.
//   - `Build_LookoutTower_C` lives under the generic `FGBuildable` class
//     alongside many decorative / structural items.
//   - `Build_PipeHyperStart_C` is the lone entry in `FGPipeHyperStart`.
//   - The eight foundation / ramp / wall variants below are referenced by
//     Tier 1 "Base Building" milestone unlocks. Their native classes
//     (FGBuildableFoundationLightweight / RampLightweight / WallLightweight)
//     contain hundreds of decorative variants we don't want to import
//     wholesale, so we cherry-pick the milestone-relevant ones.
const INCLUDED_BUILDING_CLASS_NAMES = new Set([
  'Build_LookoutTower_C',
  'Build_PipeHyperStart_C',
  'Build_Foundation_8x1_01_C',
  'Build_Foundation_8x2_01_C',
  'Build_Foundation_8x4_01_C',
  'Build_Ramp_8x1_01_C',
  'Build_Ramp_8x2_01_C',
  'Build_Ramp_8x4_01_C',
  'Build_Wall_8x4_01_C',
  'Build_Wall_Orange_8x1_C',
]);

// `nativeClass.NativeClass` is a quoted UE path like
// `/Script/CoreUObject.Class'/Script/FactoryGame.FGBuildableManufacturer'`.
// Pull out just the trailing class name so substring checks don't bleed
// across e.g. `FGBuildableManufacturer` and `FGBuildableManufacturerVariablePower`.
const NativeClassNameRegex = /FactoryGame\.([A-Za-z]+)'/;
function getNativeClassName(nativeClassPath: string | undefined): string | null {
  if (!nativeClassPath) return null;
  const match = nativeClassPath.match(NativeClassNameRegex);
  return match ? match[1] : null;
}

const INCLUDED_BUILDABLE_NATIVE_CLASS_SET = new Set(
  INCLUDED_BUILDABLE_NATIVE_CLASSES,
);

export function parseBuildings(docsJson: any) {
  const rawBuildings = docsJson.flatMap(nativeClass => {
    const className = getNativeClassName(nativeClass.NativeClass);
    if (!className) return [];
    const allowWholeClass = INCLUDED_BUILDABLE_NATIVE_CLASS_SET.has(className);
    return nativeClass.Classes.flatMap(c => {
      if (!allowWholeClass && !INCLUDED_BUILDING_CLASS_NAMES.has(c.ClassName)) {
        return [];
      }
      return [{ ...c, NativeClass: nativeClass.NativeClass }];
    });
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

/**
 * Resolve the public image path for a building. Prefer the descriptor image
 * (`buildingDescriptorsImages[Desc_<X>_C]`) since that gives us the canonical
 * filename `convertImageName` already records elsewhere. A handful of building
 * variants (e.g. `Build_BlueprintDesigner_Mk3_C`, the Mk.2/Mk.3 wall outlets)
 * have no matching `FGBuildingDescriptor` entry in the docs, so fall back to
 * a kebab-cased path derived from the display name so every building still
 * has a stable target path under `public/images/game/`.
 */
function resolveBuildingImagePath(
  building: any,
  buildingDescriptorsImages: Record<string, string>,
): string | null {
  const descriptorName = convertImageName(
    buildingDescriptorsImages[
      building.ClassName.replace('Build_', 'Desc_')
    ],
  );
  if (descriptorName) {
    return '/images/game/' + descriptorName;
  }
  if (!building.mDisplayName) return null;
  const slug = kebabCase(building.mDisplayName);
  if (!slug) return null;
  return `/images/game/${slug}_256.png`;
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
    imagePath: resolveBuildingImagePath(building, buildingDescriptorsImages),
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
  if (getNativeClassName(building.NativeClass) !== 'FGBuildableConveyorBelt') {
    return null;
  }
  return {
    isBelt: true,
    speed: parseFloat(building.mSpeed) / 2.0, // Don't know why, but the speed is doubled
  };
}

function parseBuildingsPipeline(building) {
  if (getNativeClassName(building.NativeClass) !== 'FGBuildablePipeline') {
    return null;
  }
  return {
    isPipeline: true,
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
