import { Edge, MarkerType, Node } from '@xyflow/react';
import highloader, { Highs } from 'highs';
import { useEffect, useRef, useState } from 'react';
import { log } from '../../core/logger/log';
import { getWorldResourceMax } from '../WorldResources';
import {
  avoidUnproducibleResources,
  computeProductionConstraints,
  consolidateProductionConstraints,
  SolverContext,
} from './computeProductionConstraints';
import { IIngredientEdgeData } from './edges/IngredientEdge';
import { IMachineNodeData } from './layout/MachineNode';
import { IResourceNodeData } from './layout/ResourceNode';
import { SolverRequest } from './store/SolverSlice';

const logger = log.getLogger('solver:production');
logger.setLevel('debug');

export async function loadHighs() {
  const highs = await highloader({
    locateFile: file => `/highs/${file}`,
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

export function solveProduction(highs: Highs, request: SolverRequest) {
  const ctx = new SolverContext();
  for (const item of request.outputs) {
    if (!item.amount || !item.item) continue;
    computeProductionConstraints(ctx, item.item, item.amount);
  }
  consolidateProductionConstraints(ctx);
  avoidUnproducibleResources(ctx);

  ctx.objective = /* MINIMIZE */ `${Array.from(ctx.getWorldVars())
    .map(v => `${1 / getWorldResourceMax(v.resource.id)} r${v.resource.index}`)
    .join(' + ')}\n`;

  const problem = ctx.formulateProblem();
  const result = highs.solve(problem, {});

  // console.log('Pretty:', ctx.pretty(problem));

  const nodes: Node<IResourceNodeData | IMachineNodeData>[] = [];
  const edges: Edge[] = [];

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
