import voca from 'voca';
import { AllFactoryRecipes, FactoryRecipe } from '../FactoryRecipe';
import { WorldResources } from '../WorldResources';

export const encodeResource = (resource: string) =>
  voca
    .capitalize(resource.replace('Desc_', '').replace('_C', ''))
    .substring(0, 6);

export class SolverVariables {
  productIndex = 0;
  ingredientIndex = 0;
  rawIndex = 0;

  variables = {} as Record<
    string,
    | {
        resource: string;
        type: 'product' | 'ingredient' | 'raw';
        recipe: string;
      }
    | {
        resource: string;
        type: 'link';
        input: string;
        output: string;
      }
  >;

  private recipeProductsMap = new Map<string, string>();
  private productsMap = new Map<string, string>();
  public ingredientsMap = new Map<string, string[]>();
  public worldResources = new Set<string>();

  public processedItems = new Set<string>();

  hasProduct(product: string) {
    return this.productsMap.has(product);
  }

  getRecipeProductVar(recipe: FactoryRecipe) {
    if (!this.recipeProductsMap.has(recipe.id)) {
      const varName = `p_r${recipe.index}`;
      this.variables[varName] = {
        resource: recipe.product.resource,
        type: 'product',
        recipe: recipe.id,
      };
      this.recipeProductsMap.set(recipe.id, varName);
    }
    return this.recipeProductsMap.get(recipe.id)!;
  }

  getProductVar(product: string) {
    if (!this.productsMap.has(product)) {
      const varName = this.isWorld(product)
        ? `r${this.rawIndex++}`
        : `p${this.productIndex++}`; // `xp${this.productIndex++}`;

      this.variables[varName] = {
        resource: product,
        type: this.isWorld(product) ? 'raw' : 'product',
        recipe: '',
      };
      this.productsMap.set(product, varName);
    }
    return this.productsMap.get(product)!;
  }

  getRecipeIngredientVar(recipe: FactoryRecipe, ingredient: string) {
    const varName = `xi${this.ingredientIndex++}`;
    this.variables[varName] = {
      resource: ingredient,
      type: 'ingredient',
      recipe: recipe.id,
    };

    const encodedIngredient = this.getProductVar(ingredient);

    if (!this.ingredientsMap.has(encodedIngredient)) {
      this.ingredientsMap.set(encodedIngredient, []);
    }
    this.ingredientsMap.get(encodedIngredient)!.push(varName);
    return varName;
  }

  public ingredientLinkIndex = 0;
  public ingredientLinksMap = new Map<string, string>();
  public ingredientOutboundLinks = new Map<string, string[]>();
  public ingredientInboundLinks = new Map<string, string[]>();

  getRecipesIngredientLinkVar(
    input: FactoryRecipe,
    output: FactoryRecipe,
    ingredient: string,
  ) {
    const linkKey = [input.id, output.id].join('$');
    if (!this.ingredientLinksMap.has(linkKey)) {
      const varName = `il${this.ingredientLinkIndex++}`;
      this.variables[varName] = {
        resource: ingredient,
        type: 'link',
        input: input.id,
        output: output.id,
      };

      this.ingredientLinksMap.set(linkKey, varName);

      const inputVar = this.getRecipeProductVar(input);
      const outputVar = this.getRecipeIngredientVar(output, ingredient);

      if (!this.ingredientOutboundLinks.has(inputVar)) {
        this.ingredientOutboundLinks.set(inputVar, []);
      }
      this.ingredientOutboundLinks.get(inputVar)!.push(varName);

      if (!this.ingredientInboundLinks.has(outputVar)) {
        this.ingredientInboundLinks.set(outputVar, []);
      }
      this.ingredientInboundLinks.get(outputVar)!.push(varName);
    }
    return this.ingredientLinksMap.get(linkKey)!;
  }

  isWorld(resource: string) {
    return resource in WorldResources;
  }
}

export interface SolverContext {
  variables: SolverVariables;
  constraints: string[];
}

function getAllRecipesForItem(ctx: SolverContext, item: string) {
  const recipes = AllFactoryRecipes.filter(r => r.product.resource === item);
  return recipes;
}

export function findAllRecipesForItem(
  ctx: SolverContext,
  item: string,
  amount?: number,
) {
  console.log('Finding recipes for', item);
  if (ctx.variables.processedItems.has(item)) return;
  console.log('Not found, continuing');
  ctx.variables.processedItems.add(item);

  const recipes = AllFactoryRecipes.filter(r => r.product.resource === item);

  const variables = ctx.variables;
  const productSumVar = variables.getProductVar(item);
  const productVariables = [] as string[];

  for (const recipe of recipes) {
    const recipeAmount = (recipe.product.amount * 60) / recipe.time;
    const productVar = variables.getRecipeProductVar(recipe);
    productVariables.push(productVar);

    for (const ingredient of recipe.ingredients) {
      const ingredientVar = variables.getRecipeIngredientVar(
        recipe,
        ingredient.resource,
      );
      const ingredientAmount = (ingredient.amount * 60) / recipe.time;
      const factor = recipeAmount / ingredientAmount;
      ctx.constraints.push(`${factor} ${ingredientVar} - ${productVar} = 0`);

      if (!variables.isWorld(ingredient.resource)) {
        const ingredientLinkVars = getAllRecipesForItem(
          ctx,
          ingredient.resource,
        ).map(inputRecipe => {
          const linkVar = variables.getRecipesIngredientLinkVar(
            inputRecipe,
            recipe,
            ingredient.resource,
          );
          return linkVar;
        });
        ctx.constraints.push(
          `${ingredientVar} - ${ingredientLinkVars.join(' - ')} = 0`,
        );

        findAllRecipesForItem(ctx, ingredient.resource);
      } else {
        ctx.variables.worldResources.add(ingredient.resource);
      }
    }
  }

  ctx.constraints.push(
    `${productVariables.join(' + ')} - ${productSumVar} = 0`,
  );

  if (amount) {
    ctx.constraints.push(`${productSumVar} = ${amount}`);
  }
}
