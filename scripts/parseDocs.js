import fs from 'node:fs';

const ImageRegex = /(?:UI|QuantumEnergy)\/(?:IconDesc_)?(.*)_256\./;
const IngredientRegex =
  /\(ItemClass=(?:[^\)]*)\.([^']*)(?:[^)]*)Amount=([\d.]+)\)/gm;

const docsJson = JSON.parse(fs.readFileSync('./data/docs-en.json', 'utf8'));
const toolsJson = JSON.parse(fs.readFileSync('./data/docs-tools.json', 'utf8'));

function parseDocs() {
  const rawItems = docsJson.flatMap(nativeClass => {
    console.log(nativeClass.NativeClass);
    if (
      nativeClass.NativeClass?.includes('FGItemDescriptor') ||
      nativeClass.NativeClass?.includes('FGResourceDescriptor') ||
      nativeClass.NativeClass?.includes('FGAmmoType') ||
      nativeClass.NativeClass?.includes('FGPowerShardDescriptor')
    ) {
      console.log(`Importing -> `, nativeClass.NativeClass);
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

  const rawRecipes = docsJson.flatMap(nativeClass => {
    if (nativeClass.NativeClass?.includes('FGRecipe')) {
      return nativeClass.Classes;
    }
    return [];
  });

  const recipes = rawRecipes
    .map((recipe, index) => parseRecipe(recipe, index))
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
  const mappedSlug = toolsJson.items[className].slug + '_256.png';
  return mappedSlug;
}

function parseFactoryItem(json, index) {
  if (!toolsJson.items[json.ClassName]) {
    console.log(`Missing item: ${json.ClassName}`);
    return null;
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
    imagePath: './images/' + convertImageName(json.ClassName),
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

function parseRecipe(recipe, index) {
  const producedIn = parseBestProducedIn(recipe.mProducedIn);
  if (
    producedIn === 'BuildGun' ||
    producedIn === 'WorkBench' ||
    producedIn === 'None' ||
    producedIn == null
  ) {
    return null;
  }

  return {
    index,
    id: recipe.ClassName,
    name: recipe.mDisplayName,
    description: recipe.mDescription,
    ingredients: parseIngredients(recipe.mIngredients),
    products: parseProducts(recipe.mProduct),
    time: parseFloat(recipe.mManufactoringDuration),
    producedIn: parseBestProducedIn(recipe.mProducedIn),
    powerConsumption: parseFloat(recipe.mVariablePowerConsumptionConstant),
    powerConsumptionFactor: parseFloat(recipe.mVariablePowerConsumptionFactor),
  };
}

function parseIngredients(ingredients) {
  console.log(ingredients);
  const matches = [...ingredients.matchAll(IngredientRegex)];
  console.log(matches);
  return matches.map(([_, resource, amount]) => ({
    resource,
    amount: parseFloat(amount),
  }));
}

function parseProducts(product) {
  const matches = [...product.matchAll(IngredientRegex)];
  return matches.map(([_, resource, amount]) => ({
    resource,
    amount: parseFloat(amount),
  }));
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
    return 'ParticleAccelerator';
  }
  if (producedIn.includes('QuantumEncoder')) {
    return 'QuantumEncoder';
  }
  if (producedIn.includes('Packager')) {
    return 'Packager';
  }
  if (producedIn.includes('WaterExtractor')) {
    return 'WaterExtractor';
  }
  if (producedIn.includes('Extractor')) {
    return 'Extractor';
  }
  if (producedIn.includes('Blender')) {
    return 'Blender';
  }
  return 'NA';
}
