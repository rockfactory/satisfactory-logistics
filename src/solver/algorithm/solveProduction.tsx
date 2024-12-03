import { log } from '@/core/logger/log';
import type { FactoryInput, FactoryOutput } from '@/factories/Factory';
import { IIngredientEdgeData } from '@/solver/edges/IngredientEdge';
import type { IByproductNodeData } from '@/solver/layout/nodes/byproduct-node/ByproductNode';
import { IMachineNodeData } from '@/solver/layout/nodes/machine-node/MachineNode';
import { IResourceNodeData } from '@/solver/layout/nodes/resource-node/ResourceNode';
import { SolverRequest, type SolverNodeState } from '@/solver/store/Solver';
import { Edge, MarkerType, Node } from '@xyflow/react';
import highloader, { Highs, type HighsSolution } from 'highs';
import { useEffect, useRef, useState } from 'react';
import { avoidPackagedFuelIfPossible } from './consolidate/avoidPackagedFuelIfPossible';
import { avoidUnproducibleResources } from './consolidate/avoidUnproducibleResources';
import { consolidateProductionConstraints } from './consolidate/consolidateProductionConstraints';
import { addInputResourceConstraints } from './request/addInputProductionConstraints';
import { addOutputProductionConstraints } from './request/addOutputProductionConstraints';
import { blockWorldResourcesForInputs } from './request/blockWorldResourcesForInputs';
import { applySolverObjective } from './solve/applySolverObjectives';
import { SolverContext } from './SolverContext';

const logger = log.getLogger('solver:production');
logger.setLevel('info');

export interface SolverProductionRequest extends SolverRequest {
  inputs: FactoryInput[];
  outputs: FactoryOutput[];
  nodes?: Record<string, SolverNodeState>;
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

export type SolutionNode =
  | Node<IMachineNodeData, 'Machine'>
  | Node<IResourceNodeData, 'Resource'>
  | Node<IByproductNodeData, 'Byproduct'>;
/**
 * Translates a production request into a linear programming problem and solves it,
 * returning the solution and the corresponding graph.
 */
export function solveProduction(
  highs: Highs,
  request: SolverProductionRequest,
) {
  const ctx = new SolverContext(request);

  // 1. Request
  const inputs = request.inputs ?? [];
  for (let i = 0; i < inputs.length; i++) {
    const item = inputs[i];
    if (item.amount == null || !item.resource) continue;
    addInputResourceConstraints(ctx, item, i);
  }
  blockWorldResourcesForInputs(ctx, inputs);

  const outputs = request.outputs ?? [];
  for (let i = 0; i < outputs.length; i++) {
    const item = outputs[i];
    if (item.amount == null || !item.resource) continue;
    // 2. Compute constraints
    addOutputProductionConstraints(ctx, item, i);
  }

  // 3. Consolidate
  consolidateProductionConstraints(ctx);
  avoidUnproducibleResources(ctx);
  avoidPackagedFuelIfPossible(ctx);

  // 4. Solve
  applySolverObjective(ctx, request);

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
      // Hides "0x" nodes
      if (Math.abs(value.Primal) <= 0.0001) continue;
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
              originalValue: Number(
                result.Columns[node.originalVariable].Primal,
              ),
              amplifiedValue: Number(
                result.Columns[node.amplifiedVariable].Primal,
              ),
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
              input: node.type === 'raw_input' ? node.input : undefined,
              inputIndex:
                node.type === 'raw_input' ? node.inputIndex : undefined,
              state: request.nodes?.[varName],
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
              output: node.output,
              outputIndex: node.outputIndex,
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

  return { result, nodes, edges, graph: ctx.graph, context: ctx };
}
