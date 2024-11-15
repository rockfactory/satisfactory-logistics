import fs from 'fs';
import sortBy from 'lodash/sortBy';
import { ParsingContext } from './ParsingContext';
import { convertImageName } from './images/convertImageName';

export function parseItems(docsJson: any) {
  const rawItems = docsJson.flatMap(nativeClass => {
    if (
      nativeClass.NativeClass?.includes('FGItemDescriptor') ||
      nativeClass.NativeClass?.includes('FGResourceDescriptor') ||
      nativeClass.NativeClass?.includes('FGAmmoType') ||
      nativeClass.NativeClass?.includes('FGPowerShardDescriptor') ||
      nativeClass.NativeClass?.includes('FGEquipmentDescriptor') ||
      nativeClass.NativeClass?.includes('FGVehicleDescriptor')
    ) {
      console.log(`Importing -> `, nativeClass.NativeClass);
      if (nativeClass.NativeClass?.includes('FGEquipmentDescriptor')) {
        return nativeClass.Classes.filter(
          c => c.ClassName === 'BP_ItemDescriptorPortableMiner_C',
        );
      }
      return nativeClass.Classes.filter(
        c => !c.ClassName.includes('Desc_CyberWagon_C'),
      ).map(c => ({
        ...c,
        NativeClass: nativeClass.NativeClass,
      }));
    }

    return [];
  });

  const previousItems = JSON.parse(
    fs.readFileSync('./src/recipes/FactoryItems.json').toString(),
  );
  const previousItemsIndexes = previousItems.reduce((acc, item) => {
    acc[item.id] = item.index;
    return acc;
  }, {});

  // We want to keep the same index for items that are already in the list.
  // They are used in solver state (`SolverNodeState`) and we can't just use the ID
  // since the solver has a hard limit on variable names, and we don't want
  // to use a mapping table (it's really hard to debug and maintain).
  for (const item of rawItems) {
    if (previousItemsIndexes[item.ClassName] != null) {
      item.PreviousIndex = previousItemsIndexes[item.ClassName];
    }
  }

  let nextIndex = previousItems.length;

  const items = sortBy(
    rawItems.map((item, index) =>
      parseFactoryItem(
        item,
        item.PreviousIndex != null ? item.PreviousIndex : nextIndex++,
      ),
    ),
    'index',
  );

  fs.writeFileSync(
    './src/recipes/FactoryItems.json',
    JSON.stringify(items, null, 2),
  );

  fs.writeFileSync(
    './src/recipes/FactoryItemId.ts',
    `/** Automatically generated */\nexport type FactoryItemId = ${items
      .map(item => `'${item.id}'`)
      .join(' | ')};`,
  );

  ParsingContext.itemsMap = items.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
}

function parseFactoryItem(json, index) {
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
    imagePath: '/images/game/' + convertImageName(json.mPersistentBigIcon),
    isFicsmas: json.mSmallIcon.includes('Christmas'),
    ...(json.NativeClass?.includes('FGVehicleDescriptor')
      ? { isVehicle: true }
      : {}),
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
    case 'RF_INVALID':
      return 'Invalid';
    default:
      throw new Error(`Unknown form: ${form}`);
  }
}
