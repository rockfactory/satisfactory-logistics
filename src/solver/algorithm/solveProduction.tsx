import { type Edge, MarkerType, type Node } from '@xyflow/react';
import highloader, { type Highs, type HighsSolution } from 'highs';
import { useEffect, useRef, useState } from 'react';
import { log } from '@/core/logger/log';
import type { FactoryInput, FactoryOutput } from '@/factories/Factory';
import type { FactoryItem } from '@/recipes/FactoryItem';
import type { IIngredientEdgeData } from '@/solver/edges/IngredientEdge';
import type { IByproductNodeData } from '@/solver/layout/nodes/byproduct-node/ByproductNode';
import type { IMachineNodeData } from '@/solver/layout/nodes/machine-node/MachineNode';
import type { IOutputConsumerNodeData } from '@/solver/layout/nodes/output-consumer-node/OutputConsumerNode';
import type { IUnallocatedOutputNodeData } from '@/solver/layout/nodes/output-consumer-node/UnallocatedOutputNode';
import type { IResourceNodeData } from '@/solver/layout/nodes/resource-node/ResourceNode';
import type { SolverNodeState, SolverRequest } from '@/solver/store/Solver';
import { avoidPackagedFuelIfPossible } from './consolidate/avoidPackagedFuelIfPossible';
import { avoidUnproducibleResources } from './consolidate/avoidUnproducibleResources';
import { consolidateProductionConstraints } from './consolidate/consolidateProductionConstraints';
import { addInputResourceConstraints } from './request/addInputProductionConstraints';
import { addOutputConsumerNode } from './request/addOutputConsumerNodes';
import { addOutputProductionConstraints } from './request/addOutputProductionConstraints';
import { blockWorldResourcesForInputs } from './request/blockWorldResourcesForInputs';
import { SolverContext } from './SolverContext';
import { applySolverObjective } from './solve/applySolverObjectives';

const logger = log.getLogger('solver:production');
logger.setLevel('info');

/**
 * Represents a downstream factory that consumes one of the current
 * factory's outputs. Derived by scanning every other factory's inputs
 * for ones whose `factoryId` references the current factory.
 */
export interface FactoryOutputConsumer {
  resource: string;
  amount: number;
  consumerFactoryId: string;
  consumerFactoryName?: string | null;
  /** Index of the matched input row on the consumer factory. */
  consumerInputIndex: number;
  /** Index of the matched output row on the producing factory, if any. */
  outputIndex?: number;
  /** Snapshot of the producing factory's output row, if any. */
  output?: FactoryOutput;
}

export interface SolverProductionRequest extends SolverRequest {
  inputs: FactoryInput[];
  outputs: FactoryOutput[];
  outputConsumers?: FactoryOutputConsumer[];
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
  | Node<IByproductNodeData, 'Byproduct'>
  | Node<IOutputConsumerNodeData, 'OutputConsumer'>
  | Node<IUnallocatedOutputNodeData, 'UnallocatedOutput'>;
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

  // 2b. Output consumer nodes (downstream factories that pull from this one).
  //     These are pure display markers — they live in the graph so we can
  //     iterate them after the LP solves, but they do not add any LP
  //     constraints (see addOutputConsumerNode for why).
  const outputConsumers = request.outputConsumers ?? [];
  for (let i = 0; i < outputConsumers.length; i++) {
    const consumer = outputConsumers[i];
    if (!consumer.resource || consumer.amount == null) continue;
    addOutputConsumerNode(ctx, consumer, i);
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
            label: `${typeof edge.source === 'string' ? 'Resource' : edge.source.name} -> ${typeof edge.target === 'string' ? 'Consumer' : edge.target.name}`,
            value: Number(value.Primal),
            resource: edge.resource,
          },
        });
      }
    }

    // 5. Output consumer nodes (downstream factories pulling from this one).
    //    Walk graphology directly — these have no LP variable so they don't
    //    appear in `result.Columns`. Emit the React Flow node and an edge
    //    from the matching byproduct node (the producer's "output" sink).
    //    While doing so, accumulate per-resource consumer claim totals so we
    //    can render an "Unallocated" node for any leftover production.
    const allocatedByResource = new Map<
      string,
      { item: FactoryItem; total: number }
    >();
    ctx.graph.forEachNode((nodeId, node) => {
      if (node.type !== 'raw_output') return;
      nodes.push({
        id: nodeId,
        type: 'OutputConsumer',
        data: {
          resource: node.resource,
          value: node.consumerAmount,
          consumerAmount: node.consumerAmount,
          consumerFactoryId: node.consumerFactoryId,
          consumerFactoryName: node.consumerFactoryName,
          consumerInputIndex: node.consumerInputIndex,
          output: node.output,
          outputIndex: node.outputIndex,
        } satisfies IOutputConsumerNodeData,
        position: { x: 0, y: 0 },
      });

      const existing = allocatedByResource.get(node.resource.id);
      if (existing) {
        existing.total += node.consumerAmount;
      } else {
        allocatedByResource.set(node.resource.id, {
          item: node.resource,
          total: node.consumerAmount,
        });
      }

      const byproductId = `b${node.resource.index}`;
      if (!ctx.graph.hasNode(byproductId)) return;
      edges.push({
        id: `e_${byproductId}_${nodeId}`,
        source: byproductId,
        target: nodeId,
        type: 'Ingredient',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
        data: {
          label: `${node.resource.name} -> ${node.consumerFactoryName ?? 'consumer'}`,
          value: node.consumerAmount,
          resource: node.resource,
        } as IIngredientEdgeData,
      });
    });

    // 6. Unallocated output nodes — one per resource where production
    //    exceeds the sum of declared consumer claims. Hidden when zero
    //    so a fully-allocated factory doesn't get extra clutter.
    for (const {
      item,
      total: totalAllocated,
    } of allocatedByResource.values()) {
      const byproductId = `b${item.index}`;
      const byproductCol = result.Columns[byproductId];
      if (!byproductCol) continue;
      const totalProduced = Number(byproductCol.Primal);
      const unallocated = totalProduced - totalAllocated;
      if (unallocated <= 0.0001) continue;

      const unallocatedId = `u${item.index}`;
      const matchingOutputIndex = (request.outputs ?? []).findIndex(
        o => o.resource === item.id,
      );
      const matchingOutput =
        matchingOutputIndex >= 0
          ? request.outputs[matchingOutputIndex]
          : undefined;

      nodes.push({
        id: unallocatedId,
        type: 'UnallocatedOutput',
        data: {
          resource: item,
          value: unallocated,
          totalProduced,
          totalAllocated,
          output: matchingOutput,
          outputIndex:
            matchingOutputIndex >= 0 ? matchingOutputIndex : undefined,
        } satisfies IUnallocatedOutputNodeData,
        position: { x: 0, y: 0 },
      });

      edges.push({
        id: `e_${byproductId}_${unallocatedId}`,
        source: byproductId,
        target: unallocatedId,
        type: 'Ingredient',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
        data: {
          label: `${item.name} (unallocated)`,
          value: unallocated,
          resource: item,
        } as IIngredientEdgeData,
      });
    }
  }

  return { result, nodes, edges, graph: ctx.graph, context: ctx };
}
