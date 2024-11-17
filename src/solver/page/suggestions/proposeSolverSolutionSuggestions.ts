import type { Factory } from '@/factories/Factory';
import { AllFactoryRecipes } from '@/recipes/FactoryRecipe';
import {
  getAllDefaultRecipesIds,
  getAllMAMRecipeIds,
} from '@/recipes/graph/getAllDefaultRecipes';
import { isResourceNode } from '@/solver/algorithm/getSolutionNodes';
import { isSolutionFound } from '@/solver/algorithm/solve/isSolutionFound';
import { solveProduction } from '@/solver/algorithm/solveProduction';
import type { IMachineNodeData } from '@/solver/layout/nodes/machine-node/MachineNode';
import type { SolverRequest } from '@/solver/store/Solver';
import type { Highs } from 'highs';

export interface ISolverSolutionSuggestion {
  addRecipes?: string[];
  resetOutputMinimum?: { index: number; resource: string }[];
  changeInputsUsage?: { index: number; resource: string }[];
  unblockResources?: string[];
}

export function proposeSolverSolutionSuggestions(
  highs: Highs,
  request: SolverRequest,
  inputsOutputs: Pick<Factory, 'inputs' | 'outputs'>,
) {
  console.log('No solution found, trying MAM recipes');
  const suggestions: ISolverSolutionSuggestion = {};

  // 0A. Try to unblock resources
  if (
    request.blockedResources?.length ||
    inputsOutputs.inputs?.some(i => (i.constraint ?? 'max') === 'max')
  ) {
    const withUnblockedResources = solveProduction(highs, {
      ...request,
      blockedResources: [],
      ...inputsOutputs,
      inputs: inputsOutputs.inputs.map(input => ({
        ...input,
        constraint: 'input',
      })),
    });
    if (isSolutionFound(withUnblockedResources)) {
      suggestions.unblockResources = withUnblockedResources.nodes
        .filter(isResourceNode)
        .filter(
          node =>
            node.data.isRaw &&
            request.blockedResources?.includes(node.data.resource.id),
        )
        .map(node => node.data.resource.id);

      suggestions.changeInputsUsage = withUnblockedResources.nodes
        .filter(isResourceNode)
        .filter(
          node =>
            node.data.input != null &&
            (inputsOutputs.inputs.find((_, i) => i === node.data.inputIndex)
              ?.constraint ?? 'max') === 'max',
        )
        .map(node => ({
          index: node.data.inputIndex!,
          resource: node.data.resource.id,
        }));
      console.log('Solution found with unblocked resources', suggestions);
    }
  }

  // 1. Try to unbound the output minimums (when maximization is in place)
  if (inputsOutputs.outputs.some(o => o.objective === 'max')) {
    const unboundedOutputs = inputsOutputs.outputs.map(output => ({
      ...output,
      amount: output.objective === 'max' ? 0 : output.amount,
    }));

    const withUnboundedOutputMinimums = solveProduction(highs, {
      ...request,
      ...inputsOutputs,
      outputs: unboundedOutputs,
    });
    if (isSolutionFound(withUnboundedOutputMinimums)) {
      suggestions.resetOutputMinimum = inputsOutputs.outputs
        .filter(
          (o, i) =>
            o.resource != null &&
            o.objective === 'max' &&
            unboundedOutputs[i].amount !== o.amount,
        )
        .map((output, index) => ({
          index,
          resource: output.resource!,
        }));

      console.log('Solution found with unbounded output minimums');
      return suggestions;
    }
  }

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

  if (isSolutionFound(withMamRecipes)) {
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
  if (isSolutionFound(withAllRecipes)) {
    suggestions.addRecipes = withAllRecipes.nodes
      .filter(node => node.type === 'Machine')
      .map(node => (node.data as IMachineNodeData).recipe.id)
      .filter(id => !request.allowedRecipes?.includes(id));
    return suggestions;
  }

  return suggestions;
}
