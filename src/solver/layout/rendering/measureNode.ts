import { getRecipeDisplayName } from '@/recipes/FactoryRecipe';
import type { SolutionNode } from '@/solver/algorithm/solveProduction';
import { measureText } from './measureText';

const BaseSizeWithoutTexts = {
  Machine: {
    width: 192.76,
    height: 95.38,
  },
  Resource: {
    width: 114.53,
    height: 93.41,
  },
  Byproduct: {
    width: 114.53,
    height: 93.41,
  },
};

/**
 * Not working very well, but it's a start.
 */
export function measureNode(node: SolutionNode) {
  switch (node.type) {
    case 'Machine': {
      const firstLineText = getRecipeDisplayName(node.data.recipe);
      const secondLineText = `x0.00 Machine`;
      return {
        width:
          BaseSizeWithoutTexts.Machine.width +
          Math.max(
            measureText(firstLineText, 14),
            measureText(secondLineText, 12),
          ),
        height: BaseSizeWithoutTexts.Machine.height,
      };
    }
    case 'Resource':
      return {
        width:
          BaseSizeWithoutTexts.Resource.width +
          measureText(node.data.resource.displayName, 14),
        height: BaseSizeWithoutTexts.Resource.height,
      };

    case 'Byproduct':
      return {
        width:
          BaseSizeWithoutTexts.Byproduct.width +
          measureText(node.data.resource.displayName, 14),
        height: BaseSizeWithoutTexts.Byproduct.height,
      };
  }
}
