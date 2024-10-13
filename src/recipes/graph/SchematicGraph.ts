import Graph from 'graphology';
import { bfsFromNode } from 'graphology-traversal';
import { AllFactoryRecipesMap, type FactoryRecipe } from '../FactoryRecipe';
import {
  AllFactorySchematics,
  type FactorySchematic,
} from '../FactorySchematic';

type SchematicNode =
  | {
      type: 'schematic';
      schematic: FactorySchematic;
    }
  | {
      type: 'recipe';
      recipe: FactoryRecipe;
    };

const SchematicsGraph = new Graph<SchematicNode>();

for (const schematic of AllFactorySchematics) {
  SchematicsGraph.addNode(schematic.id, { type: 'schematic', schematic });
}

for (const schematic of AllFactorySchematics) {
  for (const dependency of schematic.dependencies) {
    SchematicsGraph.addEdge(dependency, schematic.id);
  }

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

export function isDefaultRecipe(recipeId: string) {
  const sources: SchematicNode[] = [];
  bfsFromNode(SchematicsGraph, recipeId, (node, attr) => {
    if (SchematicsGraph.inDegree(node) === 0) {
      sources.push(attr);
    }
  });

  console.log(`sources for recipe "${recipeId}":`, sources);
  return;
}
