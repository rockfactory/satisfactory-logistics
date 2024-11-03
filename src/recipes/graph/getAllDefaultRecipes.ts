import { AllFactoryRecipes } from '../FactoryRecipe';
import { isWorldResource } from '../WorldResources';
import { isDefaultRecipe, isMAMRecipe } from './SchematicGraph';

export function getAllDefaultRecipesIds() {
  return AllFactoryRecipes.filter(r => {
    // console.log('r:', r, UnlockedByMap[r.id]);
    return isDefaultRecipe(r.id);
    // return !UnlockedByMap[r.id]?.every(
    //   u =>
    //     u.type !== 'Milestone' &&
    //     u.type !== 'Tutorial' &&
    //     !(u.type === 'Custom' && u.id === 'Schematic_StartingRecipes_C'),
    // );
  }).map(r => r.id);
}

export function getAllMAMRecipeIds() {
  return AllFactoryRecipes.filter(r => {
    return isMAMRecipe(r.id);
  }).map(r => r.id);
}

export function getAllAlternateRecipeIds() {
  return AllFactoryRecipes.filter(r => !isDefaultRecipe(r.id)).map(r => r.id);
}

export const AllConvertRecipes = AllFactoryRecipes.filter(
  r =>
    r.products.length === 1 &&
    isWorldResource(r.products[0].resource) &&
    r.ingredients.length === 2 &&
    r.ingredients.every(
      i => isWorldResource(i.resource) || i.resource === 'Desc_SAMIngot_C',
    ),
);

export function getAllConverterRecipeIds() {
  return AllConvertRecipes.map(r => r.id);
}
