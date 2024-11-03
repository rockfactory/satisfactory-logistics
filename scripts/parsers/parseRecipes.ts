import fs from 'fs';
import { parseIngredients } from './parseIngredients';
import { parseRecipesForPowerGenerators } from './parseRecipesForPowerGenerators';
import { ParsingContext } from './ParsingContext';

export function parseRecipes(docsJson: any) {
  const rawRecipes = docsJson.flatMap(nativeClass => {
    if (nativeClass.NativeClass?.includes('FGRecipe')) {
      return nativeClass.Classes;
    }
    return [];
  });

  const recipes = rawRecipes
    .map((recipe, index) => parseRecipe(recipe, index))
    .filter(Boolean);

  ParsingContext.recipes = recipes;

  // We need to parse power generators separately. We do this
  // _after_ assigning the recipes to the context, so we can
  // reference last index of the recipes.
  parseRecipesForPowerGenerators(docsJson);

  fs.writeFileSync(
    './src/recipes/FactoryRecipes.json',
    JSON.stringify(ParsingContext.recipes, null, 2),
  );
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

  const building = ParsingContext.buildings.find(b => b.name === producedIn);
  if (!building) {
    console.log(`Missing building: "${producedIn}"`);
    throw new Error(`Missing building: "${producedIn}"`);
  }

  const recipeId = recipe.ClassName;

  return {
    index: ParsingContext.getRecipeIndex(recipeId),
    id: recipeId,
    name: recipe.mDisplayName,
    description: recipe.mDescription,
    ingredients: parseIngredients(recipe.mIngredients, building, 'in'),
    products: parseIngredients(recipe.mProduct, building, 'out'),
    time: parseFloat(recipe.mManufactoringDuration),
    producedIn: building.id,
    powerConsumption: parseFloat(recipe.mVariablePowerConsumptionConstant),
    powerConsumptionFactor: parseFloat(recipe.mVariablePowerConsumptionFactor),
  };
}

function parseBestProducedIn(producedIn) {
  const producedInArray = producedIn.split(',').map(s => parseProducedIn(s));

  const producedInMachine = producedInArray.find(
    p => p !== 'BuildGun' && p !== 'WorkBench' && p !== 'None',
  );
  if (producedInMachine) {
    return producedInMachine;
  }

  return producedInArray[0];
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
