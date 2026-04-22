import {
  AllFactoryBuildingsMap,
  type FactoryBuilding,
} from '@/recipes/FactoryBuilding';
import { AllFactoryItemsMap, type FactoryItem } from '@/recipes/FactoryItem';
import MilestoneOnlyUnlocksJson from '@/recipes/FactoryMilestoneOnlyUnlocks.json';
import {
  AllFactoryRecipesMap,
  type FactoryRecipe,
} from '@/recipes/FactoryRecipe';
import {
  AllFactorySchematics,
  type FactorySchematic,
} from '@/recipes/FactorySchematic';

/**
 * Resolve the set of recipes / items / buildings unlocked by a given
 * schematic. Building unlocks are not modeled as their own entries in
 * `FactoryRecipes.json`, so we resolve them heuristically from the recipe
 * script names listed in `schematic.unlocks` (e.g. `Recipe_ConstructorMk1_C`
 * → `Build_ConstructorMk1_C`).
 */

const BUILDING_RECIPE_PREFIX = 'Recipe_';
const BUILDING_RECIPE_SUFFIX = '_C';
const BUILDING_PREFIX = 'Build_';

/**
 * Recipe stems whose build-target id doesn't share their name. Maps
 * `Recipe_<key>_C` directly to `Build_<value>_C`, used as the first lookup
 * before the heuristic stem-mangling below.
 */
const RECIPE_STEM_TO_BUILD_STEM_OVERRIDES: Record<string, string> = {
  UJellyLandingPad: 'LandingPad',
  PipeSupport: 'PipelineSupport',
};

function recipeScriptToBuildingCandidates(script: string): string[] {
  if (
    !script.startsWith(BUILDING_RECIPE_PREFIX) ||
    !script.endsWith(BUILDING_RECIPE_SUFFIX)
  ) {
    return [];
  }
  const stem = script.slice(
    BUILDING_RECIPE_PREFIX.length,
    -BUILDING_RECIPE_SUFFIX.length,
  );
  if (!stem) return [];
  // The data export has a few inconsistent casings between recipe and build
  // ids (e.g. `Recipe_PipelinePumpMK2_C` vs `Build_PipelinePumpMk2_C`,
  // `Recipe_BlueprintDesigner_Mk2_C` vs `Build_BlueprintDesigner_MK2_C`,
  // `Recipe_HyperTubeTJunction_C` vs `Build_HypertubeTJunction_C`).
  // Generate the small set of known capitalization swaps so the heuristic
  // still resolves them.
  const variants = new Set<string>([stem]);
  const overridden = RECIPE_STEM_TO_BUILD_STEM_OVERRIDES[stem];
  if (overridden) variants.add(overridden);
  const addCaseSwap = (from: RegExp, to: string) => {
    for (const v of Array.from(variants)) {
      if (from.test(v)) variants.add(v.replace(from, to));
    }
  };
  addCaseSwap(/Mk/g, 'MK');
  addCaseSwap(/MK/g, 'Mk');
  addCaseSwap(/HyperTube/g, 'Hypertube');
  addCaseSwap(/Hypertube/g, 'HyperTube');
  return Array.from(variants).map(
    s => `${BUILDING_PREFIX}${s}${BUILDING_RECIPE_SUFFIX}`,
  );
}

function resolveBuildingFromScript(
  script: string,
): FactoryBuilding | undefined {
  for (const candidate of recipeScriptToBuildingCandidates(script)) {
    const building = AllFactoryBuildingsMap[candidate];
    if (building) return building;
  }
  return undefined;
}

const ITEM_DESCRIPTOR_PREFIX = 'Desc_';

/**
 * Some milestones unlock a vehicle or piece of equipment via a recipe whose
 * build target lives in `FactoryItems.json` rather than `FactoryBuildings.json`
 * (locomotives, freight cars, trucks, etc.). The data export models these as
 * vehicle descriptors instead of buildables, so resolve them via the same
 * `Recipe_<X>_C` -> `Desc_<X>_C` heuristic as buildings.
 */
function resolveItemFromRecipeScript(script: string): FactoryItem | undefined {
  if (
    !script.startsWith(BUILDING_RECIPE_PREFIX) ||
    !script.endsWith(BUILDING_RECIPE_SUFFIX)
  ) {
    return undefined;
  }
  const stem = script.slice(
    BUILDING_RECIPE_PREFIX.length,
    -BUILDING_RECIPE_SUFFIX.length,
  );
  if (!stem) return undefined;
  return AllFactoryItemsMap[
    `${ITEM_DESCRIPTOR_PREFIX}${stem}${BUILDING_RECIPE_SUFFIX}`
  ];
}

export interface OtherUnlock {
  /** Original script id, e.g. `Recipe_RailroadBlockSignal_C`. */
  script: string;
  /** Humanized display label, e.g. `Railroad Block Signal`. */
  name: string;
}

/**
 * Equipment-tier items the player crafts via the build gun / equipment
 * workbench. The regular `parseRecipes` and `parseItems` exports drop these
 * because they aren't part of the production-line graph, but the tier views
 * still need to surface them. Sourced from
 * `FactoryMilestoneOnlyUnlocks.json`.
 */
export interface EquipmentUnlock {
  script: string;
  name: string;
  description: string;
  imagePath: string | null;
}

const MilestoneOnlyUnlocksMap: Record<string, EquipmentUnlock> = (
  MilestoneOnlyUnlocksJson as EquipmentUnlock[]
).reduce(
  (acc, entry) => {
    acc[entry.script] = entry;
    return acc;
  },
  {} as Record<string, EquipmentUnlock>,
);

export interface MilestoneUnlocks {
  schematic: FactorySchematic;
  recipes: FactoryRecipe[];
  buildings: FactoryBuilding[];
  /** Items first introduced (as products) by these recipes. */
  newItems: FactoryItem[];
  /**
   * Equipment / tool items unlocked by the milestone (chainsaw, jetpack,
   * hazmat suit, etc.). Sourced from `FactoryMilestoneOnlyUnlocks.json`
   * because the regular pipeline drops them.
   */
  equipment: EquipmentUnlock[];
  /**
   * Recipe scripts referenced by the schematic that aren't in
   * `FactoryRecipes.json` and don't match any building in
   * `FactoryBuildings.json` either. The data export skips a handful of
   * game features (railway signals, locomotives, freight cars,
   * customizer items, etc.) but the schematic still references them, so
   * we surface them by name to avoid misleading "no tracked unlocks"
   * states. No icon, just a label.
   */
  otherUnlocks: OtherUnlock[];
}

/**
 * Best-effort `Recipe_FooBarBaz_C` → `Foo Bar Baz` humanizer. Splits on
 * camel-case and digit boundaries, then collapses runs of capitals
 * (`MAM`, `MK`) into single tokens so we don't get "M A M".
 */
function humanizeRecipeScript(script: string): string {
  let stem = script;
  if (stem.startsWith(BUILDING_RECIPE_PREFIX)) {
    stem = stem.slice(BUILDING_RECIPE_PREFIX.length);
  }
  if (stem.endsWith(BUILDING_RECIPE_SUFFIX)) {
    stem = stem.slice(0, -BUILDING_RECIPE_SUFFIX.length);
  }
  const spaced = stem
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .trim();
  return spaced.length > 0 ? spaced : script;
}

const ITEMS_INTRODUCED_BEFORE_TIER = new Set<string>();

/**
 * Compute, for a schematic, what it newly unlocks. Items are considered "new"
 * the first time any unlocking schematic in tier-then-id order produces them,
 * so tier 1 milestones own the iron ingot, not later alternate recipes.
 */
function computeMilestoneUnlocks(
  schematic: FactorySchematic,
  introducedItems: Set<string>,
): MilestoneUnlocks {
  const recipes: FactoryRecipe[] = [];
  const buildings: FactoryBuilding[] = [];
  const newItems: FactoryItem[] = [];
  const equipment: EquipmentUnlock[] = [];
  const otherUnlocks: OtherUnlock[] = [];
  const seenOther = new Set<string>();
  const seenEquipment = new Set<string>();

  for (const unlock of schematic.unlocks) {
    if (unlock.type !== 'Recipe' || !unlock.scripts) continue;
    for (const script of unlock.scripts) {
      const recipe = AllFactoryRecipesMap[script];
      if (recipe) {
        recipes.push(recipe);
        for (const product of recipe.products) {
          if (introducedItems.has(product.resource)) continue;
          const item = AllFactoryItemsMap[product.resource];
          if (!item) continue;
          introducedItems.add(product.resource);
          newItems.push(item);
        }
        continue;
      }
      const building = resolveBuildingFromScript(script);
      if (building) {
        if (!buildings.some(b => b.id === building.id)) {
          buildings.push(building);
        }
        continue;
      }
      const item = resolveItemFromRecipeScript(script);
      if (item) {
        if (
          !introducedItems.has(item.id) &&
          !newItems.some(i => i.id === item.id)
        ) {
          introducedItems.add(item.id);
          newItems.push(item);
        }
        continue;
      }
      const equip = MilestoneOnlyUnlocksMap[script];
      if (equip) {
        if (!seenEquipment.has(script)) {
          seenEquipment.add(script);
          equipment.push(equip);
        }
        continue;
      }
      if (seenOther.has(script)) continue;
      seenOther.add(script);
      otherUnlocks.push({ script, name: humanizeRecipeScript(script) });
    }
  }

  return {
    schematic,
    recipes,
    buildings,
    newItems,
    equipment,
    otherUnlocks,
  };
}

export interface TierGroup {
  tier: number;
  schematics: FactorySchematic[];
  milestones: MilestoneUnlocks[];
  recipeCount: number;
  buildingCount: number;
  newItemCount: number;
  equipmentCount: number;
  /**
   * Count of unlocks the codex data export doesn't model (e.g. railway
   * signals, train cars). Surfaced on the tier row so milestones with
   * only this kind of unlock aren't shown as empty.
   */
  otherUnlockCount: number;
}

function buildTierGroups(): TierGroup[] {
  const introducedItems = new Set<string>(ITEMS_INTRODUCED_BEFORE_TIER);
  const tierBuckets = new Map<number, FactorySchematic[]>();

  for (const schematic of AllFactorySchematics) {
    if (schematic.tier == null) continue;
    if (schematic.type !== 'Milestone') continue;
    const list = tierBuckets.get(schematic.tier) ?? [];
    list.push(schematic);
    tierBuckets.set(schematic.tier, list);
  }

  const tiers = Array.from(tierBuckets.keys()).sort((a, b) => a - b);
  const groups: TierGroup[] = [];

  for (const tier of tiers) {
    const schematics = (tierBuckets.get(tier) ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    const milestones = schematics.map(s =>
      computeMilestoneUnlocks(s, introducedItems),
    );
    groups.push({
      tier,
      schematics,
      milestones,
      recipeCount: milestones.reduce((n, m) => n + m.recipes.length, 0),
      buildingCount: milestones.reduce((n, m) => n + m.buildings.length, 0),
      newItemCount: milestones.reduce((n, m) => n + m.newItems.length, 0),
      equipmentCount: milestones.reduce((n, m) => n + m.equipment.length, 0),
      otherUnlockCount: milestones.reduce(
        (n, m) => n + m.otherUnlocks.length,
        0,
      ),
    });
  }

  return groups;
}

export const TierGroups: TierGroup[] = buildTierGroups();

export const TierGroupsMap: Record<number, TierGroup> = TierGroups.reduce(
  (acc, group) => {
    acc[group.tier] = group;
    return acc;
  },
  {} as Record<number, TierGroup>,
);

/**
 * Lowest milestone tier that unlocks each recipe. Built from the same
 * schematic data the codex already uses. `null`/missing means the recipe is
 * either pre-unlocked, alternate, MAM, or otherwise not gated by a tier.
 */
export const RecipeTierMap: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  for (const schematic of AllFactorySchematics) {
    if (schematic.tier == null) continue;
    if (schematic.type !== 'Milestone') continue;
    for (const unlock of schematic.unlocks) {
      if (unlock.type !== 'Recipe' || !unlock.scripts) continue;
      for (const script of unlock.scripts) {
        const existing = map[script];
        if (existing == null || schematic.tier < existing) {
          map[script] = schematic.tier;
        }
      }
    }
  }
  return map;
})();

/**
 * For a given recipe, the milestones that unlock it (cached for detail pages).
 */
export const RecipeMilestonesMap: Record<string, FactorySchematic[]> = (() => {
  const map: Record<string, FactorySchematic[]> = {};
  for (const schematic of AllFactorySchematics) {
    for (const unlock of schematic.unlocks) {
      if (unlock.type !== 'Recipe' || !unlock.scripts) continue;
      for (const script of unlock.scripts) {
        if (!map[script]) map[script] = [];
        map[script].push(schematic);
      }
    }
  }
  return map;
})();

/**
 * Earliest milestone tier that introduces a given item (as a product of a
 * recipe unlocked by that milestone). Returns undefined if the item is never
 * gated by a tier (e.g. raw resources, items only made by alternates).
 */
export function getEarliestTierForItem(itemId: string): number | undefined {
  let earliest: number | undefined;
  for (const recipe of Object.values(AllFactoryRecipesMap)) {
    if (!recipe.products.some(p => p.resource === itemId)) continue;
    const tier = RecipeTierMap[recipe.id];
    if (tier == null) continue;
    if (earliest == null || tier < earliest) earliest = tier;
  }
  return earliest;
}

/**
 * Earliest milestone tier that unlocks a given building. Resolves via the
 * matching `Recipe_<X>_C` build recipe; returns undefined if no milestone
 * gates the building (e.g. starting buildings, MAM-only buildings).
 */
export function getEarliestTierForBuilding(
  buildingId: string,
): number | undefined {
  let earliest: number | undefined;
  for (const schematic of AllFactorySchematics) {
    if (schematic.tier == null) continue;
    if (schematic.type !== 'Milestone') continue;
    for (const unlock of schematic.unlocks) {
      if (unlock.type !== 'Recipe' || !unlock.scripts) continue;
      for (const script of unlock.scripts) {
        const building = resolveBuildingFromScript(script);
        if (building?.id !== buildingId) continue;
        if (earliest == null || schematic.tier < earliest) {
          earliest = schematic.tier;
        }
      }
    }
  }
  return earliest;
}

/**
 * Milestones that unlock a given building (by matching `Recipe_<X>_C` →
 * building heuristic). Used by the building detail page.
 */
export function getMilestonesForBuilding(
  buildingId: string,
): FactorySchematic[] {
  const out: FactorySchematic[] = [];
  for (const schematic of AllFactorySchematics) {
    for (const unlock of schematic.unlocks) {
      if (unlock.type !== 'Recipe' || !unlock.scripts) continue;
      const matches = unlock.scripts.some(
        script => resolveBuildingFromScript(script)?.id === buildingId,
      );
      if (matches) {
        out.push(schematic);
        break;
      }
    }
  }
  return out;
}

/**
 * Pre-built helper exporting all known tier numbers (used for filters etc.).
 */
export const AllTierNumbers: number[] = TierGroups.map(g => g.tier);

/**
 * Total counts across all tiers, surfaced on the codex landing card.
 */
export const TierTotals = {
  tiers: TierGroups.length,
  milestones: TierGroups.reduce((n, g) => n + g.milestones.length, 0),
  recipes: TierGroups.reduce((n, g) => n + g.recipeCount, 0),
  buildings: TierGroups.reduce((n, g) => n + g.buildingCount, 0),
  equipment: TierGroups.reduce((n, g) => n + g.equipmentCount, 0),
};
