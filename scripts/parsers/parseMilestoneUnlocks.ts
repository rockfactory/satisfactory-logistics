/**
 * Captures milestone unlocks (`schematic.unlocks` -> `Recipe_*_C` scripts)
 * that the regular pipeline drops. Specifically, the equipment-tier items
 * (Object Scanner, Chainsaw, Xeno-Basher, Hazmat Suit, JetPack, Hoverpack,
 * U-Jelly Landing Pad, etc.) are produced via build-gun / workbench recipes
 * which `parseRecipes.ts` filters out, and their descriptors live under
 * `FGEquipmentDescriptor` which `parseItems.ts` also filters out.
 *
 * They're still real, named, icon-bearing things the player unlocks, so the
 * codex tier views need to show them. This parser walks the docs once and
 * writes a small JSON keyed by recipe-script id with display name,
 * description, and (when extractable) imagePath. The codex resolver in
 * `tierUnlocks.ts` consults this map after recipes/buildings/items.
 */

import fs from 'node:fs';
import _ from 'lodash';

interface RawClass {
  ClassName: string;
  mDisplayName?: string;
  mDescription?: string;
  mPersistentBigIcon?: string;
  mSmallIcon?: string;
  mProduct?: string;
  mProducedIn?: string;
  NativeClass?: string;
}

interface RawNativeClass {
  NativeClass: string;
  Classes: RawClass[];
}

export interface MilestoneOnlyUnlock {
  /** e.g. `Recipe_Chainsaw_C` */
  script: string;
  /** Display name (`mDisplayName` of the recipe). */
  name: string;
  /** Free-form description, may be empty. */
  description: string;
  /**
   * Path under `public/images/game/...` for the icon. Falls back to a
   * kebab-cased path derived from the display name when the docs don't
   * carry a `mPersistentBigIcon` for the underlying descriptor, which
   * gives the wiki image importer a target to write to.
   */
  imagePath: string | null;
}

const ProductClassRegex = /\.([^']+_C)'/;

function descriptorOf(productString: string | undefined): string | null {
  if (!productString) return null;
  const match = productString.match(ProductClassRegex);
  return match ? match[1] : null;
}

function buildImagePath(
  descriptorClass: string | null,
  descriptorIcons: Record<string, string | undefined>,
  fallbackName: string,
): string | null {
  if (descriptorClass) {
    const iconResource = descriptorIcons[descriptorClass];
    if (iconResource) {
      const split = iconResource.split('.');
      const fileBase = (split[1] ?? split[0])
        .replace('IconDesc_', '')
        .replace(/_(256|512)$/, '');
      const slug = _.kebabCase(fileBase);
      if (slug) return `/images/game/${slug}_256.png`;
    }
  }
  if (!fallbackName) return null;
  const slug = _.kebabCase(fallbackName);
  return slug ? `/images/game/${slug}_256.png` : null;
}

export function parseMilestoneUnlocks(docsJson: RawNativeClass[]) {
  const recipes = new Map<string, RawClass>();
  const equipmentDescriptors = new Set<string>();
  const descriptorIcons: Record<string, string | undefined> = {};
  const schematicScriptsByMilestone = new Set<string>();

  for (const nc of docsJson) {
    if (!nc.NativeClass) continue;
    const isRecipe = nc.NativeClass.includes('FGRecipe');
    const isEquipmentDesc = nc.NativeClass.includes('FGEquipmentDescriptor');
    const isAnyDesc =
      nc.NativeClass.includes('Descriptor') ||
      nc.NativeClass.includes('FGAmmoType');
    const isSchematic = nc.NativeClass.includes('Schematic');

    for (const c of nc.Classes ?? []) {
      if (!c.ClassName) continue;
      if (isRecipe) recipes.set(c.ClassName, c);
      if (isEquipmentDesc) equipmentDescriptors.add(c.ClassName);
      if (isAnyDesc && c.mPersistentBigIcon) {
        descriptorIcons[c.ClassName] = c.mPersistentBigIcon;
      }
      if (isSchematic) {
        // Pull every Recipe script unlocked by every milestone, regardless of
        // whether it's already covered by FactoryRecipes/Items/Buildings.
        const unlocks = (c as any).mUnlocks as Array<any> | undefined;
        if (!unlocks) continue;
        for (const u of unlocks) {
          if (!u?.Class?.includes('Recipe')) continue;
          for (const m of (u.mRecipes ?? '').matchAll(
            /"\/Script[^,]*\.([^']+)/g,
          )) {
            schematicScriptsByMilestone.add(m[1]);
          }
        }
      }
    }
  }

  // Existing exports we want to *not* duplicate. Recipes/items/buildings
  // already known to the rest of the app are out of scope here.
  const knownRecipeIds = new Set<string>(
    JSON.parse(
      fs.readFileSync('./src/recipes/FactoryRecipes.json', 'utf8'),
    ).map((r: { id: string }) => r.id),
  );
  const knownItemIds = new Set<string>(
    JSON.parse(fs.readFileSync('./src/recipes/FactoryItems.json', 'utf8')).map(
      (i: { id: string }) => i.id,
    ),
  );
  const knownBuildingIds = new Set<string>(
    JSON.parse(
      fs.readFileSync('./src/recipes/FactoryBuildings.json', 'utf8'),
    ).map((b: { id: string }) => b.id),
  );

  const result: MilestoneOnlyUnlock[] = [];

  for (const script of schematicScriptsByMilestone) {
    if (knownRecipeIds.has(script)) continue;

    const recipe = recipes.get(script);
    if (!recipe) continue; // Without a recipe we have no name; skip silently.

    const productClass = descriptorOf(recipe.mProduct);
    const stem = script.replace(/^Recipe_/, '').replace(/_C$/, '');

    // Skip if the product is already a known building or item; those are
    // surfaced via the existing resolver paths in tierUnlocks.ts.
    if (productClass && knownBuildingIds.has(productClass)) continue;
    if (productClass && knownItemIds.has(productClass)) continue;
    // Some recipes resolve to Build_<Stem>_C via the heuristic in tierUnlocks
    // even when their product class is something else, so also skip those.
    if (knownBuildingIds.has(`Build_${stem}_C`)) continue;
    // Only ship things that are actually equipment, otherwise the codex would
    // start listing every BuildGun recipe (foundations, walls, ramps, ...).
    if (!productClass || !equipmentDescriptors.has(productClass)) continue;

    const name =
      recipe.mDisplayName?.trim() ||
      // recipes always have a display name in practice, but keep a safety net
      stem.replace(/([a-z])([A-Z])/g, '$1 $2').trim();

    result.push({
      script,
      name,
      description: recipe.mDescription?.trim() ?? '',
      imagePath: buildImagePath(productClass, descriptorIcons, name),
    });
  }

  result.sort((a, b) => a.name.localeCompare(b.name));

  fs.writeFileSync(
    './src/recipes/FactoryMilestoneOnlyUnlocks.json',
    JSON.stringify(result, null, 2),
  );

  console.log(
    `Wrote ${result.length} milestone-only unlocks to FactoryMilestoneOnlyUnlocks.json`,
  );
}
