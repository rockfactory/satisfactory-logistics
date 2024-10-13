const IngredientRegex =
  /\(ItemClass=(?:[^)]*)\.([^']*)(?:[^)]*)Amount=([\d.]+)\)/gm;

export function parseIngredients(
  ingredients: string,
  allItemsMap,
  building,
  dir,
) {
  const matches = [...ingredients.matchAll(IngredientRegex)];
  return matches.map(([_, resource, amount]) => {
    if (!allItemsMap[resource]) {
      console.log(`Missing ingredient: "${resource}"`);
    }
    const parsedAmount = parseFloat(amount);

    // Liquids are written in cm³, we need to convert them to m³
    let normalizedAmount =
      allItemsMap[resource]?.form === 'Liquid' ||
      allItemsMap[resource]?.form === 'Gas'
        ? parsedAmount / 1_000
        : parsedAmount;

    // Pre-LP fixes
    const displayAmount = normalizedAmount;

    // Fix for LP: we make sure that Pakcagers are a little bit _LESS_ efficient than raw resources
    if (building?.id === 'Build_Packager_C') {
      normalizedAmount =
        dir === 'in' ? normalizedAmount + 0.001 : normalizedAmount - 0.001;
    }

    return {
      resource,
      // Liquids are written in cm³, we need to convert them to m³
      amount: normalizedAmount,
      displayAmount,
      originalAmount: parsedAmount,
    };
  });
}
