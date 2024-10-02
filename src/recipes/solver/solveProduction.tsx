import { Edge, Node } from '@xyflow/react';
import highloader, { Highs } from 'highs';
import { AllFactoryItemsMap } from '../FactoryItem';
import { getWorldResourceMax, WorldResourcesList } from '../WorldResources';
import {
  computeProductionConstraints,
  consolidateProductionConstraints,
  SolverContext,
} from './computeProductionConstraints';
import { IMachineNodeData } from './layout/MachineNode';
import { IResourceNodeData } from './layout/ResourceNode';

export async function loadHighs() {
  const highs = await highloader({
    locateFile: file => `highs/${file}`,
  });
  return highs;
}

export function solveProduction(highs: Highs, item: string, amount: number) {
  const ctx = new SolverContext();
  computeProductionConstraints(ctx, item, amount);
  consolidateProductionConstraints(ctx);
  // ctx.variables.ingredientsMap.forEach((vars, ingredient) => {
  //   const constraint = `${ingredient} - ${vars.join(' - ')} >= 0`;
  //   ctx.constraints.push(constraint);
  // });
  // ctx.variables.ingredientOutboundLinks.forEach((vars, ingredient) => {
  //   const constraint = `${ingredient} - ${vars.join(' - ')} >= 0`;
  //   ctx.constraints.push(constraint);
  // });
  const objective = `MINIMIZE ${Array.from(ctx.getWorldVars())
    .map(v => `${1 / getWorldResourceMax(v.resource.id)} r${v.resource.index}`)
    .join(' + ')}\n`;

  const problem = `${objective}SUBJECT TO\n${ctx.constraints.join('\n')}\nBOUNDS\n${WorldResourcesList.map(r => `0 <= r${AllFactoryItemsMap[r].index} <= ${getWorldResourceMax(r)}`).join('\n')}\nEND`;
  console.log('Problem:\n', problem);
  const result = highs.solve(problem, {});

  const nodes: Node<IResourceNodeData | IMachineNodeData>[] = [];
  const edges: Edge[] = [];

  if (result.Status === 'Optimal') {
    for (const [varName, value] of Object.entries(result.Columns)) {
      if (Math.abs(value.Primal) < Number.EPSILON) continue;

      if (ctx.graph.hasNode(varName)) {
        const node = ctx.graph.getNodeAttributes(varName);
        if (node.type === 'output') {
          const recipe = node.recipe;
          if (recipe.products[0].resource !== node.resource.id) {
            console.log('Recipe:', recipe, ' - skipping byproducts');
            continue;
          }

          nodes.push({
            id: varName,
            type: 'Machine',
            data: {
              label: `${node.recipe.name}`,
              value: Number(value.Primal),
              recipe: node.recipe,
              resource: node.resource,
            },
            position: { x: 0, y: 0 },
          });
        }
        if (node.type === 'raw') {
          nodes.push({
            id: varName,
            type: 'Resource',
            data: {
              label: `${node.resource.name}`,
              value: Number(value.Primal),
              resource: node.resource,
            },
            position: { x: 0, y: 0 },
          });
        }
      }

      if (ctx.graph.hasEdge(varName)) {
        const edge = ctx.graph.getEdgeAttributes(varName);
        const sourceNode = ctx.graph.getSourceAttributes(varName);
        const targetNode = ctx.graph.getTargetAttributes(varName); // this is the ingredient
        if (targetNode.type !== 'input') {
          console.error('Target node is not an input node:', targetNode);
          continue;
        }
        // const machineNode = ctx.graph.getNodeAttributes(targetNode.recipeMainProductVariable);
        edges.push({
          id: varName,
          source: sourceNode.variable,
          type: 'smoothstep',
          target: targetNode.recipeMainProductVariable,
          data: {
            label: `${typeof edge.source === 'string' ? 'Resource' : edge.source.name} -> ${edge.target.name}`,
            value: Number(value.Primal),
            resource: edge.resource,
          },
        });
      }
    }
  }

  return { result, nodes, edges };
}
