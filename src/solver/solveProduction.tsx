import type { FactoryInput, FactoryOutput } from '@/factories/Factory';
import { Edge, MarkerType, Node } from '@xyflow/react';
import highloader, { Highs, type HighsSolution } from 'highs';
import { useEffect, useRef, useState } from 'react';
import { log } from '../core/logger/log';
import { getWorldResourceMax } from '../recipes/WorldResources';
import {
  addInputResourceConstraints,
  avoidUnproducibleResources,
  computeProductionConstraints,
  consolidateProductionConstraints,
  SolverContext,
} from './computeProductionConstraints';
import { IIngredientEdgeData } from './edges/IngredientEdge';
import type { IByproductNodeData } from './layout/ByproductNode';
import { IMachineNodeData } from './layout/MachineNode';
import { IResourceNodeData } from './layout/ResourceNode';
import { SolverRequest } from './store/Solver';

const logger = log.getLogger('solver:production');
logger.setLevel('info');

export interface SolverProductionRequest extends SolverRequest {
  inputs: FactoryInput[];
  outputs: FactoryOutput[];
}

export async function loadHighs() {
  const highs = await highloader({
    locateFile:
      typeof process === 'undefined' ? file => `/highs/${file}` : undefined,
  });
  return highs;
}

export function useHighs() {
  const [loading, setLoading] = useState(true);
  const highsRef = useRef<Highs | null>(null);

  useEffect(() => {
    async function load() {
      console.log('Loading highs');
      const highs = await loadHighs();
      highsRef.current = highs;
      console.log('Highs loaded');
      setLoading(false);
    }

    load().catch(error => {
      console.error(error);
      setLoading(false);
    });
  }, []);

  return { highsRef, loading };
}

function applyObjective(ctx: SolverContext, request: SolverProductionRequest) {
  switch (request.objective) {
    case 'minimize_power':
      /** MINIMIZE */
      ctx.objective = `${Array.from(ctx.getEnergyVars())
        .map(v => v.variable)
        .join(' + ')}\n`;
      break;

    case 'minimize_area':
      /** MINIMIZE */
      ctx.objective = `${Array.from(ctx.getAreaVars())
        .map(v => v.variable)
        .join(' + ')}\n`;
      break;

    case 'minimize_resources':
    default:
      /** MINIMIZE */
      ctx.objective = `${Array.from(ctx.getWorldVars())
        .map(
          v =>
            `${1 / getWorldResourceMax(v.resource.id, 'weight')} r${v.resource.index}`,
        )
        .join(' + ')}`;

      // const inputs = ctx.getWorldInputVars();
      // if (inputs.some(v => v.resource.id === 'Desc_SAMIngot_C')) {
      //   ctx.objective += ` + 0.0001 r${inputs.find(v => v.resource.id === 'Desc_SAMIngot_C')?.resource.index}`;
      // }

      ctx.objective += '\n';
  }
}

export type SolutionNode =
  | Node<IMachineNodeData, 'Machine'>
  | Node<IResourceNodeData, 'Resource'>
  | Node<IByproductNodeData, 'Byproduct'>;

export function solveProduction(
  highs: Highs,
  request: SolverProductionRequest,
) {
  const ctx = new SolverContext(request);
  for (const item of request.inputs ?? []) {
    if (!item.amount || !item.resource) continue;
    addInputResourceConstraints(ctx, item);
  }
  for (const item of request.outputs) {
    if (!item.amount || !item.resource) continue;
    computeProductionConstraints(ctx, item.resource, item.amount);
  }
  consolidateProductionConstraints(ctx);
  avoidUnproducibleResources(ctx);

  applyObjective(ctx, request);

  const problem = ctx.formulateProblem();
  let result: HighsSolution;
  try {
    result = highs.solve(problem, {});
  } catch (error) {
    logger.error('Solver error:', { error, problem });
    return null;
  }

  // logger.log('Problem:', problem);

  const nodes: SolutionNode[] = [];
  const edges: Edge[] = []; // TODO Type this like SolutionNode

  if (result.Status === 'Optimal') {
    for (const [varName, value] of Object.entries(result.Columns)) {
      if (Math.abs(value.Primal) < Number.EPSILON) continue;
      logger.debug(`${varName} = ${value.Primal}`);

      if (ctx.graph.hasNode(varName)) {
        const node = ctx.graph.getNodeAttributes(varName);
        if (node.type === 'output') {
          const recipe = node.recipe;
          if (recipe.products[0].resource !== node.resource.id) {
            logger.log('Recipe:', recipe, ' - skipping byproducts');
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
          continue;
        }

        if (node.type === 'raw' || node.type === 'raw_input') {
          nodes.push({
            id: varName,
            type: 'Resource',
            data: {
              label: `${node.resource.name}`,
              value: Number(value.Primal),
              resource: node.resource,
              isRaw: node.type === 'raw',
            } as IResourceNodeData,
            position: { x: 0, y: 0 },
          });
          continue;
        }

        if (node.type === 'byproduct') {
          nodes.push({
            id: varName,
            type: 'Byproduct',
            data: {
              label: `${node.resource.name}`,
              value: Number(value.Primal),
              resource: node.resource,
            },
            position: { x: 0, y: 0 },
          });
          continue;
        }

        if (node.type === 'energy' || node.type === 'area') {
          node.value = Number(value.Primal);
          continue;
        }

        if (node.type === 'input') continue; // Skip ingredients

        logger.error('Unknown node type:', node);
      }

      if (ctx.graph.hasEdge(varName)) {
        const edge = ctx.graph.getEdgeAttributes(varName);
        const sourceNode = ctx.graph.getSourceAttributes(varName);
        const targetNode = ctx.graph.getTargetAttributes(varName); // this is the ingredient

        // 1. Byproducts
        if (sourceNode.type === 'output' && targetNode.type === 'byproduct') {
          edges.push({
            id: varName,
            source: sourceNode.recipeMainProductVariable,
            type: 'Ingredient',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
            },
            target: targetNode.variable,
            data: {
              label: `${sourceNode.recipe.name} -> ${targetNode.resource.name} (Byproduct)`,
              value: Number(value.Primal),
              resource: targetNode.resource,
            } as IIngredientEdgeData,
          });
          continue;
        }

        // 2. Ingredient -> Recipes links
        if (targetNode.type !== 'input') {
          logger.error('Target node is not an input node:', targetNode);
          continue;
        }

        // const machineNode = ctx.graph.getNodeAttributes(targetNode.recipeMainProductVariable);
        edges.push({
          id: varName,
          source:
            sourceNode.type === 'output'
              ? sourceNode.recipeMainProductVariable
              : sourceNode.variable,
          type: 'Ingredient',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
          // type: 'Floating',
          target: targetNode.recipeMainProductVariable,
          data: {
            label: `${typeof edge.source === 'string' ? 'Resource' : edge.source.name} -> ${edge.target.name}`,
            value: Number(value.Primal),
            resource: edge.resource,
          },
        });
        continue;
      }
    }
  }

  return { result, nodes, edges, graph: ctx.graph };
}
