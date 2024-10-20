import fs from 'fs';
import { ParsingContext } from './ParsingContext';

const toolsJson = JSON.parse(fs.readFileSync('./data/docs-tools.json', 'utf8'));

export function parseItems(docsJson: any) {
  const rawItems = docsJson.flatMap(nativeClass => {
    if (
      nativeClass.NativeClass?.includes('FGItemDescriptor') ||
      nativeClass.NativeClass?.includes('FGResourceDescriptor') ||
      nativeClass.NativeClass?.includes('FGAmmoType') ||
      nativeClass.NativeClass?.includes('FGPowerShardDescriptor') ||
      nativeClass.NativeClass?.includes('FGEquipmentDescriptor')
    ) {
      console.log(`Importing -> `, nativeClass.NativeClass);
      if (nativeClass.NativeClass?.includes('FGEquipmentDescriptor')) {
        return nativeClass.Classes.filter(
          c => c.ClassName === 'BP_ItemDescriptorPortableMiner_C',
        );
      }
      return nativeClass.Classes;
    }

    return [];
  });

  const items = rawItems
    .map((item, index) => parseFactoryItem(item, index))
    .filter(item => item !== null);

  fs.writeFileSync(
    './src/recipes/FactoryItems.json',
    JSON.stringify(items, null, 2),
  );

  ParsingContext.itemsMap = items.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
}

// from `Desc_NuclearWaste_C` to `nuclear-waste.png`
// should convert to kebab-case and append `.png`, remove `Desc` prefix and `_C` suffix
function convertImageName(className) {
  const mappedSlug =
    (toolsJson.items[className]?.slug ?? 'not-available') + '_256.png';
  return mappedSlug;
}

function parseFactoryItem(json, index) {
  if (!toolsJson.items[json.ClassName]) {
    console.log(`Missing item: ${json.ClassName}`);
    // return null;
  }

  return {
    id: json.ClassName,
    index,
    name: json.mDisplayName,
    displayName: json.mDisplayName,
    description: json.mDescription,
    form: parseFactoryItemForm(json.mForm),
    sinkPoints: parseFloat(json.mResourceSinkPoints),
    sinkable: json.mCanBeDiscarded === 'True',
    energyValue: parseFloat(json.mEnergyValue),
    radioactiveDecay: parseFloat(json.mRadioactiveDecay),
    canBeDiscarded: json.mCanBeDiscarded === 'True',
    color: json.mFluidColor, // Assuming color is from mFluidColor
    // es. from `Desc_NuclearWaste_C` to `nuclear-waste.png`
    imagePath: '/images/' + convertImageName(json.ClassName),
    isFicsmas: json.mSmallIcon.includes('Christmas'),
  };
}

function parseFactoryItemForm(form) {
  switch (form) {
    case 'RF_SOLID':
      return 'Solid';
    case 'RF_LIQUID':
      return 'Liquid';
    case 'RF_GAS':
      return 'Gas';
    default:
      throw new Error(`Unknown form: ${form}`);
  }
}
