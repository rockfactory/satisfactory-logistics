import Graph from 'graphology';
import voca from 'voca';
import { AllFactoryItemsMap, FactoryItem } from '../FactoryItem';
import { AllFactoryRecipes, FactoryRecipe } from '../FactoryRecipe';
import { WorldResources } from '../WorldResources';

export const encodeResource = (resource: string) =>
  voca
    .capitalize(resource.replace('Desc_', '').replace('_C', ''))
    .substring(0, 6);

// export class SolverVariables {
//   productIndex = 0;
//   ingredientIndex = 0;
//   rawIndex = 0;

//   variables = {} as Record<
//     string,
//     | {
//         resource: string;
//         type: 'product' | 'ingredient' | 'raw';
//         recipe: string;
//       }
//     | {
//         resource: string;
//         type: 'link';
//         input: string;
//         output: string;
//       }
//   >;

//   private recipeProductsMap = new Map<string, string>();
//   private productsMap = new Map<string, string>();
//   public ingredientsMap = new Map<string, string[]>();
//   public worldResources = new Set<string>();

//   public processedItems = new Set<string>();

//   hasProduct(product: string) {
//     return this.productsMap.has(product);
//   }

//   getRecipeProductVar(recipe: FactoryRecipe) {
//     if (!this.recipeProductsMap.has(recipe.id)) {
//       const varName = `p_r${recipe.index}`;
//       this.variables[varName] = {
//         resource: recipe.product.resource,
//         type: 'product',
//         recipe: recipe.id,
//       };
//       this.recipeProductsMap.set(recipe.id, varName);
//     }
//     return this.recipeProductsMap.get(recipe.id)!;
//   }

//   getProductVar(product: string) {
//     if (!this.productsMap.has(product)) {
//       const varName = this.isWorld(product)
//         ? `r${this.rawIndex++}`
//         : `p${this.productIndex++}`; // `xp${this.productIndex++}`;

//       this.variables[varName] = {
//         resource: product,
//         type: this.isWorld(product) ? 'raw' : 'product',
//         recipe: '',
//       };
//       this.productsMap.set(product, varName);
//     }
//     return this.productsMap.get(product)!;
//   }

//   getRecipeIngredientVar(recipe: FactoryRecipe, ingredient: string) {
//     const varName = `xi${this.ingredientIndex++}`;
//     this.variables[varName] = {
//       resource: ingredient,
//       type: 'ingredient',
//       recipe: recipe.id,
//     };

//     const encodedIngredient = this.getProductVar(ingredient);

//     if (!this.ingredientsMap.has(encodedIngredient)) {
//       this.ingredientsMap.set(encodedIngredient, []);
//     }
//     this.ingredientsMap.get(encodedIngredient)!.push(varName);
//     return varName;
//   }

//   public ingredientLinkIndex = 0;
//   public ingredientLinksMap = new Map<string, string>();
//   public ingredientOutboundLinks = new Map<string, string[]>();
//   public ingredientInboundLinks = new Map<string, string[]>();

//   getRecipesIngredientLinkVar(
//     input: FactoryRecipe,
//     output: FactoryRecipe,
//     ingredient: string,
//   ) {
//     const linkKey = [input.id, output.id].join('$');
//     if (!this.ingredientLinksMap.has(linkKey)) {
//       const varName = `il${this.ingredientLinkIndex++}`;
//       this.variables[varName] = {
//         resource: ingredient,
//         type: 'link',
//         input: input.id,
//         output: output.id,
//       };

//       this.ingredientLinksMap.set(linkKey, varName);

//       const inputVar = this.getRecipeProductVar(input);
//       const outputVar = this.getRecipeIngredientVar(output, ingredient);

//       if (!this.ingredientOutboundLinks.has(inputVar)) {
//         this.ingredientOutboundLinks.set(inputVar, []);
//       }
//       this.ingredientOutboundLinks.get(inputVar)!.push(varName);

//       if (!this.ingredientInboundLinks.has(outputVar)) {
//         this.ingredientInboundLinks.set(outputVar, []);
//       }
//       this.ingredientInboundLinks.get(outputVar)!.push(varName);
//     }
//     return this.ingredientLinksMap.get(linkKey)!;
//   }

//   isWorld(resource: string) {
//     return resource in WorldResources;
//   }
// }

type SolverNode =
  | { type: 'raw'; label: string; resource: FactoryItem; variable: string }
  | {
      type: 'output';
      label: string;
      recipe: FactoryRecipe;
      resource: FactoryItem;
      variable: string;
    }
  | {
      type: 'input';
      label: string;
      recipe: FactoryRecipe;
      recipeMainProductVariable: string;
      resource: FactoryItem;
      variable: string;
    }
  | {
      type: 'resource';
      label: string;
      resource: FactoryItem;
      variable: string;
    };

type SolverEdge = {
  type: 'link';
  resource: FactoryItem;
  source: FactoryRecipe | 'world';
  target: FactoryRecipe;
  variable: string;
};

export class SolverContext {
  // variables: SolverVariables;
  processedRecipes = new Set<string>();
  graph = new Graph<SolverNode, SolverEdge>();
  constraints: string[] = [];

  private aliasIndex = 0;
  private aliases: Record<string, string> = {};
  private aliasesReverse: Record<string, string> = {};

  getWorldVars() {
    return this.graph
      .filterNodes((node, attributes) => attributes.type === 'raw')
      .map(node => this.graph.getNodeAttributes(node));
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
}

function getAllRecipesForItem(ctx: SolverContext, item: string) {
  const recipes = AllFactoryRecipes.filter(r =>
    r.products.some(p => p.resource === item),
  );
  return recipes;
}

function isWorldResource(resource: string) {
  return resource in WorldResources;
}

export function consolidateProductionConstraints(ctx: SolverContext) {
  const resourceNodes = ctx.graph.filterNodes(
    (node, attributes) => attributes.type === 'resource',
  );

  for (const nodeName of resourceNodes) {
    const node = ctx.graph.getNodeAttributes(nodeName);
    const inbound = ctx.graph.inboundNeighbors(nodeName);
    const outbound = ctx.graph.outboundNeighbors(nodeName);

    // Wood, ecc.
    // if (
    //   (inbound.length === 0 && outbound.length !== 0) ||
    //   (inbound.length !== 0 && outbound.length === 0)
    // ) {
    //   console.error('Invalid node', { node, inbound, outbound });
    //   throw new Error('Invalid node');
    // }

    if (inbound.length > 0) {
      ctx.constraints.push(
        `${inbound.join(' + ')} - p${node.resource.index} = 0`,
      );
    }
    if (outbound.length > 0) {
      ctx.constraints.push(
        `p${node.resource.index} - ${outbound.join(' - ')} >= 0`,
      );
    }

    for (const inboundVar of inbound) {
      const inbound = ctx.graph.getNodeAttributes(inboundVar);
      if (inbound.type !== 'output' && inbound.type !== 'raw') {
        console.error('Invalid inbound node type', inbound, node);
        throw new Error('Invalid inbound node type');
      }

      for (const outboundVar of outbound) {
        const outbound = ctx.graph.getNodeAttributes(outboundVar);
        if (outbound.type !== 'input') {
          console.error('Invalid outbound node type', outbound, node);
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
          },
        );
        console.log('Link:', { inboundVar, outboundVar, edge, inserted });
      }
    }

    for (const inboundVar of inbound) {
      const inbound = ctx.graph.getNodeAttributes(inboundVar);
      if (node.resource.id === 'Desc_AlienPowerFuel_C') {
        console.log('Inbound:', inboundVar, outbound);
      }
      if (outbound.length === 0) continue;
      ctx.constraints.push(
        `${inboundVar} - ${outbound.map(outboundVar => ctx.encodeVar(`l_${inboundVar}_${outboundVar}`)).join(' - ')} = 0`,
      );
    }

    for (const outboundVar of outbound) {
      if (inbound.length === 0) continue;
      if (node.resource.id === 'Desc_AlienPowerFuel_C') {
        console.log('Outbound:', outboundVar, inbound);
      }
      const outbound = ctx.graph.getNodeAttributes(outboundVar);
      ctx.constraints.push(
        `${outboundVar} - ${inbound.map(inboundVar => ctx.encodeVar(`l_${inboundVar}_${outboundVar}`)).join(' - ')} >= 0`,
      );
    }
  }
}

function setGraphResource(ctx: SolverContext, resource: string) {
  ctx.graph.mergeNode(resource, {
    type: 'resource',
    label: resource,
    resource: AllFactoryItemsMap[resource],
    variable: resource,
  });
}

export function computeProductionConstraints(
  ctx: SolverContext,
  resource: string,
  amount?: number,
) {
  console.log('Processing recipes for: ', resource);

  const resourceItem = AllFactoryItemsMap[resource];
  const recipes = getAllRecipesForItem(ctx, resource);
  const rawVar = `r${resourceItem.index}`;
  if (isWorldResource(resource) && !ctx.graph.hasNode(rawVar)) {
    console.log('Adding raw resource:', resource);
    setGraphResource(ctx, resource);
    ctx.graph.mergeNode(rawVar, {
      type: 'raw',
      label: resource,
      resource: resourceItem,
      variable: rawVar,
    });
    ctx.graph.mergeEdge(rawVar, resource);
  }

  if (amount) {
    ctx.constraints.push(`p${resourceItem.index} = ${amount}`);
  }

  for (const recipe of recipes) {
    if (ctx.processedRecipes.has(recipe.id)) continue;
    ctx.processedRecipes.add(recipe.id);
    const mainProductItem = AllFactoryItemsMap[recipe.products[0].resource];
    console.log(' Processing recipe:', recipe.name, { mainProductItem, recipe }); // prettier-ignore

    for (const ingredient of recipe.ingredients) {
      console.log('  Processing ingredient:', ingredient.resource);
      const ingredientItem = AllFactoryItemsMap[ingredient.resource];
      const recipeIngredientVar = `i${ingredientItem.index}r${recipe.index}`;
      setGraphResource(ctx, ingredient.resource);
      ctx.graph.addNode(recipeIngredientVar, {
        type: 'input',
        label: `Ingredient: ${ingredientItem.displayName} (${recipe.name})`,
        recipe,
        resource: ingredientItem,
        variable: recipeIngredientVar,
        recipeMainProductVariable: `p${mainProductItem.index}r${recipe.index}`,
      });
      ctx.graph.mergeEdge(ingredient.resource, recipeIngredientVar);
    }

    for (const product of recipe.products) {
      console.log('  Processing product:', product.resource);
      const isTarget = product.resource === resource;

      const productItem = AllFactoryItemsMap[product.resource];
      const recipeProductVar = `p${productItem.index}r${recipe.index}`;
      setGraphResource(ctx, product.resource);
      ctx.graph.addNode(recipeProductVar, {
        type: 'output',
        label: `Product: ${productItem.displayName} (${recipe.name})`,
        recipe,
        resource: productItem,
        variable: recipeProductVar,
      });
      ctx.graph.mergeEdge(recipeProductVar, product.resource);

      const productAmount = (product.amount * 60) / recipe.time;

      for (const ingredient of recipe.ingredients) {
        const ingredientItem = AllFactoryItemsMap[ingredient.resource];
        const recipeIngredientVar = `i${ingredientItem.index}r${recipe.index}`;
        const ingredientAmount = (ingredient.amount * 60) / recipe.time;
        const factor = productAmount / ingredientAmount;

        ctx.constraints.push(
          `${factor} ${recipeIngredientVar} - ${recipeProductVar} = 0`,
        );

        computeProductionConstraints(ctx, ingredient.resource);
      }
    }
  }
}

// export function findAllRecipesForItem(
//   ctx: SolverContext,
//   item: string,
//   amount?: number,
// ) {
//   console.log('Finding recipes for', item);
//   if (ctx.variables.processedItems.has(item)) return;
//   console.log('Not found, continuing');
//   ctx.variables.processedItems.add(item);

//   const recipes = AllFactoryRecipes.filter(r => r.product.resource === item);

//   const variables = ctx.variables;
//   const productSumVar = variables.getProductVar(item);
//   const productVariables = [] as string[];

//   for (const recipe of recipes) {
//     const recipeAmount = (recipe.product.amount * 60) / recipe.time;
//     const productVar = variables.getRecipeProductVar(recipe);
//     productVariables.push(productVar);

//     for (const ingredient of recipe.ingredients) {
//       const ingredientVar = variables.getRecipeIngredientVar(
//         recipe,
//         ingredient.resource,
//       );
//       const ingredientAmount = (ingredient.amount * 60) / recipe.time;
//       const factor = recipeAmount / ingredientAmount;
//       ctx.constraints.push(`${factor} ${ingredientVar} - ${productVar} = 0`);

//       if (!variables.isWorld(ingredient.resource)) {
//         const ingredientLinkVars = getAllRecipesForItem(
//           ctx,
//           ingredient.resource,
//         ).map(inputRecipe => {
//           const linkVar = variables.getRecipesIngredientLinkVar(
//             inputRecipe,
//             recipe,
//             ingredient.resource,
//           );
//           return linkVar;
//         });
//         ctx.constraints.push(
//           `${ingredientVar} - ${ingredientLinkVars.join(' - ')} = 0`,
//         );

//         findAllRecipesForItem(ctx, ingredient.resource);
//       } else {
//         ctx.variables.worldResources.add(ingredient.resource);
//       }
//     }
//   }

//   ctx.constraints.push(
//     `${productVariables.join(' + ')} - ${productSumVar} = 0`,
//   );

//   if (amount) {
//     ctx.constraints.push(`${productSumVar} = ${amount}`);
//   }
// }
