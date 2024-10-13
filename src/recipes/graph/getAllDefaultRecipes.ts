import { AllFactoryRecipes } from '../FactoryRecipe';
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
