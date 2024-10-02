import { Edge, Node } from '@xyflow/react';
import highloader, { Highs, HighsLinearSolutionColumn } from 'highs';
import { AllFactoryItemsMap } from '../FactoryItem';
import { AllFactoryRecipesMap } from '../FactoryRecipe';
import { getWorldResourceMax, WorldResourcesList } from '../WorldResources';
import {
  findAllRecipesForItem,
  SolverContext,
  SolverVariables,
} from './findAllRecipesForItem';

export async function loadHighs() {
  const highs = await highloader({
    locateFile: file => `highs/${file}`,
  });
  return highs;
}

export function solveProduction(highs: Highs, item: string, amount: number) {
  const ctx: SolverContext = {
    variables: new SolverVariables(),
    constraints: [],
  };
  findAllRecipesForItem(ctx, item, amount);
  ctx.variables.ingredientsMap.forEach((vars, ingredient) => {
    const constraint = `${ingredient} - ${vars.join(' - ')} >= 0`;
    ctx.constraints.push(constraint);
  });
  ctx.variables.ingredientOutboundLinks.forEach((vars, ingredient) => {
    const constraint = `${ingredient} - ${vars.join(' - ')} >= 0`;
    ctx.constraints.push(constraint);
  });
  const objective = `MINIMIZE ${Array.from(
    ctx.variables.worldResources.values(),
  )
    .map(v => `${1 / getWorldResourceMax(v)} ${ctx.variables.getProductVar(v)}`)
    .join(' + ')}\n`;

  const problem = `${objective}SUBJECT TO\n${ctx.constraints.join('\n')}\nBOUNDS\n${WorldResourcesList.map(r => `0 <= ${ctx.variables.getProductVar(r)} <= ${getWorldResourceMax(r)}`).join('\n')}\nEND`;
  console.log('Problem:\n', problem);
  const result = highs.solve(problem, {});

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (result.Status === 'Optimal') {
    for (const [varName, value] of Object.entries(result.Columns)) {
      const variable = ctx.variables.variables[varName];
      if (!variable) {
        console.error('Variable not found:', varName);
        continue;
      }

      if (Math.abs(value.Primal) < Number.EPSILON) continue;

      if (variable.type === 'raw') {
        const resource = AllFactoryItemsMap[variable.resource]!;
        nodes.push({
          id: varName,
          type: 'Resource',
          data: {
            label: `${resource.displayName}`,
            value: value.Primal,
            resource,
            variable,
            type: 'raw',
          },
          position: { x: 0, y: 0 },
        });
      }

      if (variable.type === 'product' && variable.recipe !== '') {
        const recipe = AllFactoryRecipesMap[variable.recipe]!;
        const resource = AllFactoryItemsMap[variable.resource]!;
        nodes.push({
          id: varName,
          type: 'Machine',
          data: {
            label: `${resource.displayName} (${recipe.name})`,
            value: value.Primal,
            resource,
            recipe,
            variable,
            type: 'product',
          },
          position: { x: 0, y: 0 },
        });
      }

      if (variable.type === 'ingredient') {
        if (ctx.variables.isWorld(variable.resource)) {
          const recipe = AllFactoryRecipesMap[variable.recipe]!;
          edges.push({
            id: varName,
            source: ctx.variables.getProductVar(variable.resource),
            target: ctx.variables.getRecipeProductVar(recipe),
            data: {
              label: `${variable.resource}`,
              value: value.Primal,
              resource: AllFactoryItemsMap[variable.resource]!,
              variable,
              type: 'ingredient',
            },
          });
        }
      }

      if (variable.type === 'link') {
        const input = AllFactoryRecipesMap[variable.input]!;
        const output = AllFactoryRecipesMap[variable.output]!;
        const ingredient = AllFactoryItemsMap[variable.resource]!;
        edges.push({
          id: varName,
          source: ctx.variables.getRecipeProductVar(input),
          target: ctx.variables.getRecipeProductVar(output),
          data: {
            label: `${ingredient.displayName} (${input.name} -> ${output.name})`,
            value: value.Primal,
            resource: ingredient,
            variable,
            type: 'link',
          },
        });
      }
    }

    const normalizedValues = Object.fromEntries(
      Object.entries(result.Columns).map(
        ([varName, value]: [string, HighsLinearSolutionColumn]) => {
          const variable = ctx.variables.variables[varName];
          if (!variable) {
            console.error('Variable not found:', varName);
          }

          const resource = AllFactoryItemsMap[variable.resource]!;
          if (
            variable.type === 'raw' ||
            (variable.type === 'product' && variable.recipe === '')
          ) {
            return [resource.displayName + ' ' + varName, value.Primal];
          }

          if (variable.type === 'product') {
            const recipe = AllFactoryRecipesMap[variable.recipe]!;
            return [
              `OUT: ${resource.displayName} (${recipe.name})` + ' ' + varName,
              value.Primal,
            ];
          }

          if (variable.type === 'ingredient') {
            const recipe = AllFactoryRecipesMap[variable.recipe]!;
            const ingredient = AllFactoryItemsMap[variable.resource]!;
            return [
              `IN: ${ingredient.displayName} (${recipe.name})` + ' ' + varName,
              value.Primal,
            ];
          }

          if (variable.type === 'link') {
            const input = AllFactoryRecipesMap[variable.input]!;
            const output = AllFactoryRecipesMap[variable.output]!;
            return [
              `LNK: ${resource.displayName} (${input.name} -> ${output.name})`,
              value.Primal,
            ];
          }

          return [resource.displayName, value.Primal];
        },
      ),
    );
    const valued = Object.entries(normalizedValues).filter(
      ([name, value]: [string, number]) => Math.abs(value) > Number.EPSILON,
    );

    console.log('Valued:');
    console.table(valued);
    for (const [name, value] of Object.entries(normalizedValues)) {
      console.log(name, value);
    }
  }

  return { result, nodes, edges };
}
