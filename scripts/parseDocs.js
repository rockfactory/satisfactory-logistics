import _ from 'lodash';
import fs from 'node:fs';

const ImageRegex = /(?:UI|QuantumEnergy)\/(?:IconDesc_)?(.*)_256\./;
const IngredientRegex =
  /\(ItemClass=(?:[^\)]*)\.([^']*)(?:[^)]*)Amount=([\d.]+)\)/gm;

const docsJson = JSON.parse(fs.readFileSync('./data/docs-en.json', 'utf8'));
const toolsJson = JSON.parse(fs.readFileSync('./data/docs-tools.json', 'utf8'));

function parseDocs() {
  const rawItems = docsJson.flatMap(nativeClass => {
    if (
      nativeClass.NativeClass?.includes('FGItemDescriptor') ||
      nativeClass.NativeClass?.includes('FGResourceDescriptor') ||
      nativeClass.NativeClass?.includes('FGAmmoType') ||
      nativeClass.NativeClass?.includes('FGPowerShardDescriptor') ||
      nativeClass.NativeClass?.includes('FGEquipmentDescriptor')
    ) {
      console.log(`Importing -> `, nativeClass.NativeClass);
      if (nativeClass.NativeClass?.includes('FGEquipmentDescriptor')) {
        return nativeClass.Classes.filter(
          c => c.ClassName === 'BP_ItemDescriptorPortableMiner_C',
        );
      }
      return nativeClass.Classes;
    }

    return [];
  });

  const items = rawItems
    .map((item, index) => parseFactoryItem(item, index))
    .filter(item => item !== null);
  fs.writeFileSync(
    './src/recipes/FactoryItems.json',
    JSON.stringify(items, null, 2),
  );

  const allItemsMap = items.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  // Buildings
  const rawBuildings = docsJson.flatMap(nativeClass => {
    if (nativeClass.NativeClass?.includes('FGBuildableManufacturer'))
      return nativeClass.Classes;
    return [];
  });
  const buildings = rawBuildings
    .map((building, index) => parseBulding(building, index))
    .filter(Boolean);
  fs.writeFileSync(
    './src/recipes/FactoryBuildings.json',
    JSON.stringify(buildings, null, 2),
  );

  // Recipes
  const rawRecipes = docsJson.flatMap(nativeClass => {
    if (nativeClass.NativeClass?.includes('FGRecipe')) {
      return nativeClass.Classes;
    }
    return [];
  });

  const recipes = rawRecipes
    .map((recipe, index) => parseRecipe(recipe, index, allItemsMap, buildings))
    .filter(Boolean);

  fs.writeFileSync(
    './src/recipes/FactoryRecipes.json',
    JSON.stringify(recipes, null, 2),
  );
}

parseDocs();

// from `Desc_NuclearWaste_C` to `nuclear-waste.png`
// should convert to kebab-case and append `.png`, remove `Desc` prefix and `_C` suffix
function convertImageName(className) {
  const mappedSlug =
    (toolsJson.items[className]?.slug ?? 'not-available') + '_256.png';
  return mappedSlug;
}

function parseFactoryItem(json, index) {
  if (!toolsJson.items[json.ClassName]) {
    console.log(`Missing item: ${json.ClassName}`);
    // return null;
  }

  return {
    id: json.ClassName,
    index,
    name: json.mDisplayName,
    displayName: json.mDisplayName,
    description: json.mDescription,
    form: parseFactoryItemForm(json.mForm),
    sinkPoints: parseFloat(json.mResourceSinkPoints),
    sinkable: json.mCanBeDiscarded === 'True',
    powerConsumption: parseFloat(json.mEnergyValue),
    radioactiveDecay: parseFloat(json.mRadioactiveDecay),
    canBeDiscarded: json.mCanBeDiscarded === 'True',
    color: json.mFluidColor, // Assuming color is from mFluidColor
    // es. from `Desc_NuclearWaste_C` to `nuclear-waste.png`
    imagePath: '/images/' + convertImageName(json.ClassName),
    isFicsmas: json.mSmallIcon.includes('Christmas'),
  };
}

function parseFactoryItemForm(form) {
  switch (form) {
    case 'RF_SOLID':
      return 'Solid';
    case 'RF_LIQUID':
      return 'Liquid';
    case 'RF_GAS':
      return 'Gas';
    default:
      throw new Error(`Unknown form: ${form}`);
  }
}

function parseRecipe(recipe, index, allItemsMap, buildings) {
  const producedIn = parseBestProducedIn(recipe.mProducedIn);
  if (
    producedIn === 'BuildGun' ||
    producedIn === 'WorkBench' ||
    producedIn === 'None' ||
    producedIn == null
  ) {
    return null;
  }

  const building = buildings.find(b => b.name === producedIn);
  if (!building) {
    console.log(`Missing building: "${producedIn}"`);
    throw new Error(`Missing building: "${producedIn}"`);
  }

  return {
    index,
    id: recipe.ClassName,
    name: recipe.mDisplayName,
    description: recipe.mDescription,
    ingredients: parseIngredients(
      recipe.mIngredients,
      allItemsMap,
      building,
      'in',
    ),
    products: parseIngredients(recipe.mProduct, allItemsMap, building, 'out'),
    time: parseFloat(recipe.mManufactoringDuration),
    producedIn: building.id,
    powerConsumption: parseFloat(recipe.mVariablePowerConsumptionConstant),
    powerConsumptionFactor: parseFloat(recipe.mVariablePowerConsumptionFactor),
  };
}

function parseIngredients(ingredients, allItemsMap, building, dir) {
  const matches = [...ingredients.matchAll(IngredientRegex)];
  return matches.map(([_, resource, amount]) => {
    if (!allItemsMap[resource]) {
      console.log(`Missing ingredient: "${resource}"`);
    }
    const parsedAmount = parseFloat(amount);

    // Liquids are written in cm³, we need to convert them to m³
    let normalizedAmount =
      allItemsMap[resource].form === 'Solid'
        ? parsedAmount
        : parsedAmount / 1_000;

    // Pre-LP fixes
    const displayAmount = normalizedAmount;

    // Fix for LP: we make sure that Pakcagers are a little bit _LESS_ efficient than raw resources
    if (building.id === 'Build_Packager_C') {
      normalizedAmount =
        dir === 'in' ? normalizedAmount + 0.001 : normalizedAmount - 0.001;
    }

    return {
      resource,
      // Liquids are written in cm³, we need to convert them to m³
      amount: normalizedAmount,
      displayAmount,
      originalAmount: parsedAmount,
    };
  });
}

function parseBestProducedIn(producedIn) {
  const producedInArray = producedIn.split(',').map(s => parseProducedIn(s));
  if (producedInArray.length === 1 && producedInArray[0] === 'BuildGun') {
    return producedInArray[0];
  }

  return producedInArray.find(p => p !== 'BuildGun');
}

function parseProducedIn(producedIn) {
  if (producedIn.includes('BuildGun')) {
    return 'BuildGun';
  }
  if (producedIn.includes('WorkBench')) {
    return 'WorkBench';
  }
  if (producedIn === '') {
    return 'None';
  }
  if (producedIn.includes('Constructor')) {
    return 'Constructor';
  }
  if (producedIn.includes('Assembler')) {
    return 'Assembler';
  }
  if (producedIn.includes('Manufacturer')) {
    return 'Manufacturer';
  }
  if (producedIn.includes('Refinery')) {
    return 'Refinery';
  }
  if (producedIn.includes('Foundry')) {
    return 'Foundry';
  }
  if (producedIn.includes('Converter')) {
    return 'Converter';
  }
  if (producedIn.includes('Smelter')) {
    return 'Smelter';
  }
  if (producedIn.includes('HadronCollider')) {
    return 'Particle Accelerator';
  }
  if (producedIn.includes('QuantumEncoder')) {
    return 'Quantum Encoder';
  }
  if (producedIn.includes('Packager')) {
    return 'Packager';
  }
  if (producedIn.includes('WaterExtractor')) {
    return 'Water Extractor';
  }
  if (producedIn.includes('Extractor')) {
    return 'Extractor';
  }
  if (producedIn.includes('Blender')) {
    return 'Blender';
  }
  return 'NA';
}

function parseBulding(building, index) {
  return {
    id: building.ClassName,
    name: building.mDisplayName,
    index,
    description: building.mDescription,
    powerConsumption: parseFloat(building.mPowerConsumption),
    powerConsumptionExponent: parseFloat(building.mPowerConsumptionExponent),
    somersloopPowerConsumptionExponent: parseFloat(
      building.mProductionBoostPowerConsumptionExponent,
    ),
    clearanceData: building.mClearanceData,
    clearance: parseClearanceData(building.mClearanceData),
    imagePath: '/images/' + _.kebabCase(building.mDisplayName) + '_256.png',
  };
}

function parseClearanceData(data) {
  return {}; // TODO
}
