import type { FactoryInput, FactoryOutput } from '@/factories/Factory';
import Graph from 'graphology';
import { last } from 'lodash';
import voca from 'voca';
import { log } from '../../core/logger/log';
import { AllFactoryBuildingsMap } from '../../recipes/FactoryBuilding';
import { AllFactoryItemsMap, FactoryItem } from '../../recipes/FactoryItem';
import {
  FactoryRecipe,
  NotProducibleItems,
  getAllRecipesForItem,
} from '../../recipes/FactoryRecipe';
import {
  WorldResourcesList,
  getWorldResourceMax,
  isWorldResource,
} from '../../recipes/WorldResources';
import type { SolverProductionRequest } from './solveProduction';

const logger = log.getLogger('recipes:solver');
logger.setLevel('info');

export const encodeResource = (resource: string) =>
  voca
    .capitalize(resource.replace('Desc_', '').replace('_C', ''))
    .substring(0, 6);

export type SolverResourceNode = {
  type: 'resource';
  label: string;
  resource: FactoryItem;
  variable: string;
};

export type SolverRawNode = {
  type: 'raw';
  label: string;
  resource: FactoryItem;
  variable: string;
};

export type SolverRawInputNode = {
  type: 'raw_input';
  label: string;
  resource: FactoryItem;
  variable: string;
  forceUsage?: boolean;
};

export type SolverOutputNode = {
  type: 'output';
  label: string;
  recipe: FactoryRecipe;
  recipeMainProductVariable: string;
  resource: FactoryItem;
  variable: string;
  amplifiedVariable: string;
  originalVariable: string;
  byproductVariable: string;
};

export type SolverByproductNode = {
  type: 'byproduct';
  label: string;
  resource: FactoryItem;
  variable: string;
};

export type SolverInputNode = {
  type: 'input';
  label: string;
  recipe: FactoryRecipe;
  recipeMainProductVariable: string;
  resource: FactoryItem;
  variable: string;
};

export type SolverEnergyNode = {
  type: 'energy';
  label: string;
  recipe: FactoryRecipe;
  variable: string;
  // Only after solving
  value?: number;
};

export type SolverAreaNode = {
  type: 'area';
  variable: string;
  // Only after solving
  value?: number;
};

export type SolverNode =
  | SolverRawNode
  | SolverRawInputNode
  | SolverOutputNode
  | SolverByproductNode
  | SolverInputNode
  | SolverResourceNode
  | SolverEnergyNode
  | SolverAreaNode;

export type SolverEdge = {
  type: 'link';
  resource: FactoryItem;
  source: FactoryRecipe | 'world';
  target: FactoryRecipe;
  variable: string;
  label: string;
};

export class SolverContext {
  // variables: SolverVariables;
  request: SolverProductionRequest;
  processedRecipes = new Set<string>();
  allowedRecipes = new Set<string>();
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
    if (!this.request.allowedBuildings) return true;
    return this.request.allowedBuildings.includes(recipe.producedIn);
  }

  getWorldResourceMaxIfAllowed(resource: string) {
    if (!this.request.allowedResources) {
      return getWorldResourceMax(resource);
    }
    return this.request.allowedResources.includes(resource)
      ? getWorldResourceMax(resource)
      : 0;
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

export function consolidateProductionConstraints(ctx: SolverContext) {
  const resourceNodes = ctx.graph.filterNodes(
    (node, attributes) => attributes.type === 'resource',
  );
  // Resource nodes mixing recipe outputs to all ingredients
  for (const nodeName of resourceNodes) {
    const node = ctx.graph.getNodeAttributes(nodeName) as SolverResourceNode;
    const producers = ctx.graph.inboundNeighbors(nodeName);
    const consumers = ctx.graph.outboundNeighbors(nodeName);

    if (producers.length > 0) {
      ctx.constraints.push(
        `${producers.join(' + ')} - p${node.resource.index} = 0`,
      );
    } else {
      logger.debug('No producers for', node.resource);
      // If there are no producers, we need to set the production to 0
      ctx.bounds.push(`p${node.resource.index} = 0`);
      ctx.bounds.push(`b${node.resource.index} = 0`);
    }

    // Even if there are no consumers, we still need to add the constraint
    // to handle output (byproduct) resources
    ctx.constraints.push(
      `p${node.resource.index} ${consumers.length > 0 ? ' - ' + consumers.join(' - ') : ''} - b${node.resource.index} = 0`,
    );

    for (const inboundVar of producers) {
      const inbound = ctx.graph.getNodeAttributes(inboundVar);
      if (
        inbound.type !== 'output' &&
        inbound.type !== 'raw' &&
        inbound.type !== 'raw_input'
      ) {
        logger.error('Invalid inbound node type', inbound, node);
        throw new Error('Invalid inbound node type');
      }

      for (const outboundVar of consumers) {
        const outbound = ctx.graph.getNodeAttributes(outboundVar);
        if (outbound.type !== 'input') {
          logger.error('Invalid outbound node type', outbound, node);
          throw new Error('Invalid outbound node type');
        }
        const [edge, inserted] = ctx.graph.mergeEdgeWithKey(
          ctx.encodeVar(`l_${inboundVar}_${outboundVar}`),
          inboundVar,
          outboundVar,
          {
            type: 'link',
            resource: node.resource,
            source: inbound.type === 'output' ? inbound.recipe : 'world',
            target: outbound.recipe,
            variable: ctx.encodeVar(`l_${inboundVar}_${outboundVar}`),
            label: `Link: ${inbound.label} -> ${outbound.label}`,
          },
        );
      }
    }

    // From producer P to ingredients I1, I2, I3
    for (const producerVar of producers) {
      const producer = ctx.graph.getNodeAttributes(producerVar);

      const byproductVar =
        producer.type === 'output' ? producer.byproductVariable : null;

      ctx.constraints.push(
        `${producerVar} ${consumers.length === 0 ? '' : ' - ' + consumers.map(consumerVar => ctx.encodeVar(`l_${producerVar}_${consumerVar}`)).join(' - ')} ${byproductVar ? `- ${byproductVar}` : ''} = 0`,
      );
    }

    // From producers P1, P2, P3 to consumer C
    for (const consumerVar of consumers) {
      if (producers.length === 0) {
        ctx.constraints.push(`${consumerVar} = 0`);
        continue;
      }

      const consumer = ctx.graph.getNodeAttributes(consumerVar);
      ctx.constraints.push(
        `${consumerVar} - ${producers.map(producerVar => ctx.encodeVar(`l_${producerVar}_${consumerVar}`)).join(' - ')} = 0`,
      );
    }
  }

  // Byproducts
  const byproductNodes = ctx.graph.filterNodes(
    (node, attributes) => attributes.type === 'byproduct',
  );
  for (const nodeName of byproductNodes) {
    const node = ctx.graph.getNodeAttributes(nodeName);
    // Es. `b${productItem.index}r${recipe.index}`
    const byproductEdges = ctx.graph.inboundEdges(nodeName);
    if (byproductEdges.length > 0) {
      ctx.constraints.push(
        `${node.variable} - ${byproductEdges.join(' - ')} = 0`,
      );
    } else {
      // TODO Verify
      logger.warn('Byproduct without producers', node);
      ctx.bounds.push(`${node.variable} = 0`);
    }
  }
}

export function avoidUnproducibleResources(ctx: SolverContext) {
  NotProducibleItems.forEach(resource => {
    ctx.bounds.push(`p${AllFactoryItemsMap[resource].index} = 0`);
  });
}

function setGraphResource(ctx: SolverContext, resource: string) {
  ctx.graph.mergeNode(resource, {
    type: 'resource',
    label: resource,
    resource: AllFactoryItemsMap[resource],
    variable: resource,
  });
}

function setGraphByproduct(ctx: SolverContext, resource: string) {
  const item = AllFactoryItemsMap[resource];
  ctx.graph.mergeNode(`b${item.index}`, {
    type: 'byproduct',
    label: `Byproduct: ${item.displayName}`,
    resource: item,
    variable: `b${item.index}`,
  });
}

/**
 * Compute the constraints for a given input resource.
 */
export function addInputResourceConstraints(
  ctx: SolverContext,
  { resource, amount, forceUsage }: FactoryInput,
) {
  setGraphResource(ctx, resource!);
  const resourceItem = AllFactoryItemsMap[resource!];
  const rawVar = isWorldResource(resource!)
    ? `r${resourceItem.index}`
    : `ri${resourceItem.index}`;
  ctx.graph.mergeNode(rawVar, {
    type: isWorldResource(resource!) ? 'raw' : 'raw_input',
    label: resource!,
    resource: resourceItem,
    variable: rawVar,
    forceUsage,
  });
  ctx.graph.mergeEdge(rawVar, resource!);

  // If the resource is forced, we need to add a constraint to be _exactly_ the amount
  if (forceUsage) {
    ctx.constraints.push(`${rawVar} = ${amount ?? 0}`);
  } else if (!isWorldResource(resource!)) {
    ctx.constraints.push(`ri${resourceItem.index} <= ${amount ?? 0}`);
  }
  // ctx.constraints.push(`${rawVar} - ${amount ?? 0} >= 0`);
}

/**
 * Compute the constraints for a given output resource.
 */
export function addOutputProductionConstraints(
  ctx: SolverContext,
  output: FactoryOutput,
) {
  const { resource, amount, objective } = output;
  if (!resource) {
    logger.error('Missing resource in output', output);
    return;
  }

  const resourceItem = AllFactoryItemsMap[resource];

  // If we are requesting a specific amount, we need to add a constraint
  // (this means we are in a user-configured output and not in recursive mode)
  // Depending on the objective, we can set the amount as a minimum
  // or as a fixed value.
  if (amount) {
    setGraphResource(ctx, resource);
    switch (objective) {
      case 'max':
        ctx.constraints.push(`b${resourceItem.index} >= ${amount}`);
        break;
      case 'default':
      default:
        ctx.constraints.push(`b${resourceItem.index} = ${amount}`);
    }
  }

  computeProductionConstraints(ctx, resource);
}

/**
 * Recursively compute the constraints for a given resource, given
 * the available recipes.
 */
export function computeProductionConstraints(
  ctx: SolverContext,
  resource: string,
  amount?: number,
) {
  logger.debug('Processing recipes for: ', resource);

  const resourceItem = AllFactoryItemsMap[resource];
  const recipes = getAllRecipesForItem(resource);
  const rawVar = `r${resourceItem.index}`;
  if (isWorldResource(resource) && !ctx.graph.hasNode(rawVar)) {
    logger.debug('Adding raw resource:', resource);
    setGraphResource(ctx, resource);
    ctx.graph.mergeNode(rawVar, {
      type: 'raw',
      label: resource,
      resource: resourceItem,
      variable: rawVar,
    });
    ctx.graph.mergeEdge(rawVar, resource);
  }

  for (const recipe of recipes) {
    if (!ctx.isRecipeAllowed(recipe.id)) continue;
    if (!ctx.isRecipeProducedInAllowedBuilding(recipe)) continue;
    if (ctx.processedRecipes.has(recipe.id)) continue;
    ctx.processedRecipes.add(recipe.id);
    const mainProductItem = AllFactoryItemsMap[recipe.products[0].resource];
    const mainProductVar = `p${mainProductItem.index}r${recipe.index}`;
    const mainProductAmount = (recipe.products[0].amount * 60) / recipe.time;
    logger.debug(' Processing recipe:', recipe.name, { mainProductItem, recipe }); // prettier-ignore

    // TODO We need to check that this amplification is correct given
    // the _result_ of the solver, since it's considered based on the source
    // let amplification = 1.0;
    // const amplificationVar = `amp${recipe.index}`;
    // ctx.constraints.push(`${amplificationVar} = ${amplification}`);
    // if (ctx.request.nodes?.[mainProductVar]?.amplification) {
    //   amplification = ctx.request.nodes[mainProductVar].amplification;
    // }

    // const buildingsVar = `c${recipe.index}`;
    const building = AllFactoryBuildingsMap[recipe.producedIn];

    // 1. Energy consumption. Used for minimization
    const recipeEnergyVar = `e${recipe.index}`;
    ctx.graph.mergeNode(recipeEnergyVar, {
      type: 'energy',
      label: `Energy: ${recipe.name}`,
      recipe,
      variable: recipeEnergyVar,
    });
    // TODO No edge for now. We don't need it for minimization
    const energyConsumptionFactor =
      building.averagePowerConsumption / mainProductAmount;

    const somersloops = ctx.request?.nodes?.[mainProductVar]?.somersloops ?? 0;
    const overclock = ctx.request?.nodes?.[mainProductVar]?.overclock ?? 1;

    ctx.constraints.push(
      `${recipeEnergyVar} - ${energyConsumptionFactor} ${mainProductVar} = 0`,
    );

    // 2. Building Area
    const recipeAreaVar = `area${recipe.index}`;
    ctx.graph.mergeNode(recipeAreaVar, {
      type: 'area',
      variable: recipeAreaVar,
    });
    const areaFactor =
      // Space occupied by the building
      (building.clearance.width * building.clearance.length) /
      // How many products produced in a minute by the building
      mainProductAmount;

    ctx.constraints.push(
      `${recipeAreaVar} - ${areaFactor} ${mainProductVar} >= 0`,
    );
    ctx.constraints.push(
      // Atleast one building
      `${recipeAreaVar} >= ${building.clearance.width * building.clearance.length}`,
    );

    // 3. Ingredients
    for (const ingredient of recipe.ingredients) {
      // logger.debug('  Processing ingredient:', ingredient.resource);
      const ingredientItem = AllFactoryItemsMap[ingredient.resource];
      const recipeIngredientVar = `i${ingredientItem.index}r${recipe.index}`;
      setGraphResource(ctx, ingredient.resource);
      ctx.graph.addNode(recipeIngredientVar, {
        type: 'input',
        label: `Ingredient: ${ingredientItem.displayName} (${recipe.name})`,
        recipe,
        resource: ingredientItem,
        variable: recipeIngredientVar,
        recipeMainProductVariable: mainProductVar,
      });
      ctx.graph.mergeEdge(ingredient.resource, recipeIngredientVar);
      ctx.graph.mergeEdge(recipeIngredientVar, mainProductVar);
    }

    for (const product of recipe.products) {
      // logger.debug('  Processing product:', product.resource);
      const isMain = product.resource === recipe.products[0].resource;

      const productItem = AllFactoryItemsMap[product.resource];
      const recipeProductVar = `p${productItem.index}r${recipe.index}`;
      const recipeOriginalProductVar = `p${productItem.index}r${recipe.index}o`;
      const recipeAmplifiedProductVar = `p${productItem.index}r${recipe.index}a`;
      const recipeByproductVar = `b${productItem.index}r${recipe.index}`;
      setGraphResource(ctx, product.resource);
      ctx.graph.mergeNode(recipeProductVar, {
        type: 'output',
        label: `Product: ${productItem.displayName} (${recipe.name})`,
        recipe,
        resource: productItem,
        variable: recipeProductVar,
        amplifiedVariable: recipeAmplifiedProductVar,
        originalVariable: recipeOriginalProductVar,
        recipeMainProductVariable: mainProductVar,
        byproductVariable: recipeByproductVar,
      } as SolverOutputNode);
      ctx.graph.mergeEdge(recipeProductVar, product.resource);
      const productAmount = (product.amount * 60) / recipe.time;

      // Sloop
      ctx.constraints.push(
        `${recipeProductVar} - ${recipeAmplifiedProductVar} - ${recipeOriginalProductVar} = 0`,
      );

      if (somersloops > 0) {
        const productAmountPerSloop =
          (productAmount / building.somersloopSlots) * overclock;
        ctx.constraints.push(
          `${recipeAmplifiedProductVar} - ${recipeOriginalProductVar} <= 0`,
        );
        ctx.bounds.push(
          `${recipeAmplifiedProductVar} <= ${somersloops * productAmountPerSloop}`,
        );
        logger.info('  Adding somersloops:', recipe.name, productAmountPerSloop, last(ctx.constraints)); // prettier-ignore
      } else {
        ctx.constraints.push(`${recipeAmplifiedProductVar} = 0`);
      }

      // Byproduct
      setGraphByproduct(ctx, product.resource);
      ctx.graph.mergeEdgeWithKey(
        recipeByproductVar,
        recipeProductVar,
        `b${productItem.index}`,
      );

      if (!isMain) {
        ctx.graph.mergeEdge(mainProductVar, recipeProductVar); // Debug

        const factor = mainProductAmount / productAmount;
        ctx.constraints.push(
          // TODO Enhance variable name.
          `${factor} ${recipeOriginalProductVar} - ${mainProductVar}o = 0`,
        );
        // logger.debug(
        //   '  Adding constraint:',
        //   `${factor} ${recipeProductVar} - ${mainProductVar} = 0`,
        // );
      }

      for (const ingredient of recipe.ingredients) {
        const ingredientItem = AllFactoryItemsMap[ingredient.resource];
        const recipeIngredientVar = `i${ingredientItem.index}r${recipe.index}`;
        const ingredientAmount = (ingredient.amount * 60) / recipe.time;
        const factor = productAmount / ingredientAmount;

        ctx.constraints.push(
          `${factor} ${recipeIngredientVar} - ${recipeOriginalProductVar} = 0`,
        );

        computeProductionConstraints(ctx, ingredient.resource);
      }
    }
  }
}
