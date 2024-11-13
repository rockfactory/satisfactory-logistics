import Graph from 'graphology';
import { bfsFromNode } from 'graphology-traversal';
import { AllFactoryRecipesMap, type FactoryRecipe } from '@/recipes/FactoryRecipe';
import {
  AllFactorySchematics,
  type FactorySchematic,
} from '@/recipes/FactorySchematic';

type SchematicNode =
  | {
      type: 'schematic';
      schematic: FactorySchematic;
    }
  | {
      type: 'recipe';
      recipe: FactoryRecipe;
    };

export const SchematicsGraph = new Graph<SchematicNode>();

for (const schematic of AllFactorySchematics) {
  SchematicsGraph.addNode(schematic.id, { type: 'schematic', schematic });
}

for (const schematic of AllFactorySchematics) {
  // TODO Redundant, remove from parsing too
  // for (const dependency of schematic.dependencies) {
  //   SchematicsGraph.addEdge(dependency, schematic.id);
  // }

  for (const unlock of schematic.unlocks) {
    if (unlock.type === 'Recipe') {
      for (const recipeId of unlock.scripts ?? []) {
        SchematicsGraph.mergeNode(recipeId, {
          type: 'recipe',
          recipe: AllFactoryRecipesMap[recipeId],
        });
        SchematicsGraph.addEdge(schematic.id, recipeId);
      }
    }

    if (unlock.type === 'Schematic') {
      for (const unlockSchematicId of unlock.scripts ?? []) {
        SchematicsGraph.addEdge(schematic.id, unlockSchematicId);
      }
    }
  }
}

export function getRecipeRootUnlockSchematics(recipeId: string) {
  const sources: SchematicNode[] = [];
  if (SchematicsGraph.hasNode(recipeId)) {
    bfsFromNode(
      SchematicsGraph,
      recipeId,
      (node, attr) => {
        if (SchematicsGraph.inDegree(node) === 0) {
          sources.push(attr);
        }
      },
      { mode: 'inbound' },
    );
  }

  return sources;
}

export function isDefaultRecipe(recipeId: string) {
  const sources = getRecipeRootUnlockSchematics(recipeId);
  return (
    sources.length === 0 ||
    sources.some(
      s =>
        (s.type === 'schematic' &&
          s.schematic.id === 'Schematic_StartingRecipes_C') ||
        (s.type === 'schematic' && s.schematic.type === 'Milestone') ||
        (s.type === 'schematic' && s.schematic.type === 'Tutorial'),
    )
  );
}

export function isMAMRecipe(recipeId: string) {
  const sources = getRecipeRootUnlockSchematics(recipeId);
  return sources.some(
    s => s.type === 'schematic' && s.schematic.type === 'MAM',
  );
}
