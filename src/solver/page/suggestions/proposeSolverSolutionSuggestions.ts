import type { Factory } from '@/factories/Factory';
import { AllFactoryRecipes } from '@/recipes/FactoryRecipe';
import {
  getAllDefaultRecipesIds,
  getAllMAMRecipeIds,
} from '@/recipes/graph/getAllDefaultRecipes';
import type { IMachineNodeData } from '@/solver/layout/MachineNode';
import { solveProduction } from '@/solver/solveProduction';
import type { SolverRequest } from '@/solver/store/Solver';
import type { Highs } from 'highs';

export interface ISolverSolutionSuggestion {
  addRecipes?: string[];
}

// TODO BUg. Inputs influences outputs, so much that if they can't be used, the solver is Infeasible
// We should atleast:
// 1) Add an option to "ignore" the inputs (or to "force" their usage).
// 2) Add a solver fallback which tries to remove the inputs and solve again.
// const usedBatterRecipe = withMamRecipes.nodes.filter(
//   node =>
//     node.type === 'Machine' &&
//     (node.data as IMachineNodeData).recipe.id.includes('Batter'),
// );
// console.log('usedBatterRecipe', usedBatterRecipe);

export function proposeSolverSolutionSuggestions(
  highs: Highs,
  request: SolverRequest,
  inputsOutputs: Pick<Factory, 'inputs' | 'outputs'>,
) {
  console.log('No solution found, trying MAM recipes');
  const suggestions: ISolverSolutionSuggestion = {};

  //  1. Try to solve with MAM recipes
  const withMamRecipes = solveProduction(highs, {
    ...request,
    objective: 'minimize_power',
    allowedRecipes: [
      ...(request.allowedRecipes ?? []),
      ...getAllDefaultRecipesIds(),
      ...getAllMAMRecipeIds(),
    ],
    ...inputsOutputs,
  });

  if (withMamRecipes.result.Status === 'Optimal') {
    console.log('Solution found with MAM recipes');
    console.log('Solution found with MAM recipes', withMamRecipes);
    suggestions.addRecipes = withMamRecipes.nodes
      .filter(node => node.type === 'Machine')
      .map(node => (node.data as IMachineNodeData).recipe.id)
      .filter(id => !request.allowedRecipes?.includes(id));
    return suggestions;
  }

  // 2. Try to solve with all recipes
  const withAllRecipes = solveProduction(highs, {
    ...request,
    objective: 'minimize_power',
    allowedRecipes: AllFactoryRecipes.map(recipe => recipe.id),
    ...inputsOutputs,
  });
  if (withAllRecipes.result.Status === 'Optimal') {
    suggestions.addRecipes = withAllRecipes.nodes
      .filter(node => node.type === 'Machine')
      .map(node => (node.data as IMachineNodeData).recipe.id)
      .filter(id => !request.allowedRecipes?.includes(id));
    return suggestions;
  }

  return suggestions;
}
