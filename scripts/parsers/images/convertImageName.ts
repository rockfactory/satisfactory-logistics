import _ from 'lodash';
import { ParsingContext } from 'scripts/parsers/ParsingContext';

// from `Desc_NuclearWaste_C` to `nuclear-waste.png`
// should convert to kebab-case and append `.png`, remove `Desc` prefix and `_C` suffix
export function convertImageName(resourcePath) {
  if (!resourcePath) {
    return null;
  }
  const imageName =
    _.kebabCase(
      resourcePath
        .split('.')[1]
        .replace('IconDesc_', '')
        .replace(/_(256|512)/, ''),
    ) + '_256.png';

  ParsingContext.images.push({
    resourcePath,
    imageName,
  });
  return imageName;
}
