import { FactoryBuildingsForRecipes } from '@/recipes/FactoryBuilding';

/**
 * Converts an allowedBuildings list to a blockedBuildings list for the solver.
 * Semantics:
 *  - undefined/null -> undefined (no restrictions)
 *  - [] (empty)     -> undefined (no restrictions — empty means "not configured")
 *  - [...ids]       -> blocks all buildings NOT in the list
 */
export function allowedToBlockedBuildings(
  allowedBuildings: string[] | null | undefined,
): string[] | undefined {
  if (!allowedBuildings?.length) return undefined;
  return FactoryBuildingsForRecipes.filter(
    b => !allowedBuildings.includes(b.id),
  ).map(b => b.id);
}
