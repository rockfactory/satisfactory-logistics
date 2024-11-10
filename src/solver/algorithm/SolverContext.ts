import { log } from '@/core/logger/log';
import type { FactoryOutput } from '@/factories/Factory';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import type { FactoryRecipe } from '@/recipes/FactoryRecipe';
import {
  getWorldResourceMax,
  WorldResourcesList,
} from '@/recipes/WorldResources';
import Graph from 'graphology';
import type { SolverProductionRequest } from './solveProduction';
import type {
  SolverAreaNode,
  SolverByproductNode,
  SolverEdge,
  SolverEnergyNode,
  SolverNode,
  SolverRawInputNode,
  SolverRawNode,
} from './SolverNode';

const logger = log.getLogger('recipes:solver');
logger.setLevel('info');

export class SolverContext {
  // variables: SolverVariables;
  request: SolverProductionRequest;
  processedRecipes = new Set<string>();
  allowedRecipes?: Set<string>;
  graph = new Graph<SolverNode, SolverEdge>();
  constraints: string[] = [];
  /**
   * Not implemented yet.
   */
  integers: string[] = [];
  bounds: string[] = [];
  objective?: string;

  constructor(request: SolverProductionRequest) {
    this.request = request;

    if (this.request.allowedRecipes != null) {
      this.allowedRecipes = new Set(this.request.allowedRecipes);
    }
  }

  private aliasIndex = 0;
  private aliases: Record<string, string> = {};
  private aliasesReverse: Record<string, string> = {};

  getWorldVars() {
    return this.graph
      .filterNodes((node, attributes) => attributes.type === 'raw')
      .map(node => this.graph.getNodeAttributes(node) as SolverRawNode);
  }

  getWorldInputVars() {
    return this.graph
      .filterNodes((node, attributes) => attributes.type === 'raw_input')
      .map(node => this.graph.getNodeAttributes(node) as SolverRawInputNode);
  }

  getEnergyVars() {
    return this.graph
      .filterNodes((node, attributes) => attributes.type === 'energy')
      .map(node => this.graph.getNodeAttributes(node) as SolverEnergyNode);
  }

  getAreaVars() {
    return this.graph
      .filterNodes((node, attributes) => attributes.type === 'area')
      .map(node => this.graph.getNodeAttributes(node) as SolverAreaNode);
  }

  getMaximizedOutputs() {
    return this.graph
      .filterNodes(
        (node, attributes) =>
          attributes.type === 'byproduct' &&
          attributes.output?.objective === 'max',
      )
      .map(
        node =>
          this.graph.getNodeAttributes(node) as SolverByproductNode & {
            output: FactoryOutput;
          },
      );
  }

  encodeVar(name: string) {
    if (!this.aliases[name]) {
      this.aliases[name] = `a${this.aliasIndex++}`;
      this.aliasesReverse[this.aliases[name]] = name;
    }
    return this.aliases[name];
  }

  decodeVar(varName: string) {
    return this.aliasesReverse[varName];
  }

  pretty(problem: string) {
    return problem.replace(
      /([a-z][\w]+)/g,
      (substring, rawVariable: string) => {
        const variable = rawVariable.startsWith('a')
          ? this.decodeVar(rawVariable)
          : rawVariable;

        if (this.graph.hasNode(variable)) {
          const node = this.graph.getNodeAttributes(variable);
          return '[' + ('label' in node ? node.label : node.variable) + ']';
        }
        if (this.graph.hasEdge(variable)) {
          const edge = this.graph.getEdgeAttributes(variable);
          return '[' + edge.label + ']';
        }

        return variable;
      },
    );
  }

  isRecipeAllowed(recipe: string) {
    if (this.allowedRecipes == null) return true;
    return this.allowedRecipes.has(recipe);
  }

  isRecipeProducedInAllowedBuilding(recipe: FactoryRecipe) {
    if (!this.request.blockedBuildings) return true;
    return !this.request.blockedBuildings.includes(recipe.producedIn);
  }

  getWorldResourceMaxIfAllowed(resource: string) {
    if (!this.request.blockedResources) {
      return getWorldResourceMax(resource);
    }

    if (this.request.blockedResources.includes(resource)) {
      return 0;
    }

    if (this.request.resourcesAmount?.[resource] != null) {
      return this.request.resourcesAmount[resource];
    }

    return getWorldResourceMax(resource);
  }

  formulateProblem() {
    if (!this.objective) {
      throw new Error('Objective not set');
    }

    const problem = [
      `MINIMIZE`, // TODO make configurable
      this.objective,
      `SUBJECT TO`,
      ...this.constraints,
      `BOUNDS`,
      ...WorldResourcesList.map(
        r =>
          `0 <= r${AllFactoryItemsMap[r].index} <= ${this.getWorldResourceMaxIfAllowed(r)}`,
      ),
      ...this.bounds,
      // `GENERAL`,
      // ...this.integers.join(' '),
      `END`,
    ].join('\n');
    logger.log('Problem:\n', problem);
    return problem;
  }
}

export function setGraphResource(ctx: SolverContext, resource: string) {
  ctx.graph.mergeNode(resource, {
    type: 'resource',
    label: resource,
    resource: AllFactoryItemsMap[resource],
    variable: resource,
  });
}

export function setGraphByproduct(
  ctx: SolverContext,
  resource: string,
  attributes?: Partial<SolverByproductNode>,
) {
  const item = AllFactoryItemsMap[resource];
  ctx.graph.mergeNode(`b${item.index}`, {
    type: 'byproduct',
    label: `Byproduct: ${item.displayName}`,
    resource: item,
    variable: `b${item.index}`,
    ...attributes,
  });
}
