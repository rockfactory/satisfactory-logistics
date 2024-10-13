import type { RecipeIngredient } from './FactoryRecipe';

export interface FactorySchematic {
  id: string;
  name: string;
  unlockName: string;
  description: string;
  tier: number | null;
  type: SchematicType;
  imagePath?: string | null;
  dependencies: string[];
  unlocks: SchematicUnlock[];
  hiddenUntilDependeciesMet: boolean;
  cost: RecipeIngredient[];
}

export interface SchematicUnlock {
  type: 'Recipe' | 'Schematic';
  scripts?: string[];
}

export type SchematicType =
  | 'Milestone'
  | 'Tutorial'
  | 'Custom'
  | 'Alternate'
  | 'MAM';

import RawFactorySchematics from './FactorySchematics.json';

export const AllFactorySchematics: FactorySchematic[] =
  RawFactorySchematics as FactorySchematic[];

export const AllFactorySchematicsMap = AllFactorySchematics.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<string, FactorySchematic>,
);

export const UnlockedByMap = AllFactorySchematics.reduce(
  (acc, schematic) => {
    schematic.unlocks.forEach(unlock => {
      unlock.scripts?.forEach(script => {
        if (!acc[script]) {
          acc[script] = [];
        }
        acc[script].push({
          type: schematic.type,
          id: schematic.id,
        });
      });
    });
    return acc;
  },
  {} as Record<string, Array<{ type: SchematicType; id: string }>>,
);
