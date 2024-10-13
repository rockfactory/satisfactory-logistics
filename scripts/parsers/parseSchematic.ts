import type {
  FactorySchematic,
  SchematicType,
} from '@/recipes/FactorySchematic';
import fs from 'fs';
import { parseIngredients } from './parseIngredients';

export function parseSchematics(docsJson: any, allItemsMap) {
  const raws: RawSchematic[] = docsJson.flatMap(nativeClass => {
    if (nativeClass.NativeClass?.includes('Schematic')) {
      return nativeClass.Classes;
    }
    return [];
  });

  const schematics = raws
    .map(raw => parseSchematic(raw, allItemsMap))
    .filter(Boolean);

  fs.writeFileSync(
    './src/recipes/FactorySchematics.json',
    JSON.stringify(schematics, null, 2),
  );
}

const ScriptsRegex = /"\/Script[^,]*\.([^']+)/g;
function parseScriptsArray(raw: string | null) {
  const matches = [...(raw ?? '').matchAll(ScriptsRegex)];
  return matches.map(([_, script]) => {
    return script;
  });
}

function parseSchematic(raw: RawSchematic, allItemsMap): FactorySchematic {
  return {
    id: raw.ClassName,
    name: raw.mDisplayName,
    unlockName: raw.mDisplayName,
    description: raw.mUnlockDescription ?? '',
    tier: raw.mTechTier === '0' ? null : parseInt(raw.mTechTier),
    type: raw.mType?.replace('EST_', '') as SchematicType,
    imagePath: null,
    dependencies:
      raw.mSchematicDependencies.flatMap(
        dep => parseScriptsArray(dep.mSchematics) ?? [],
      ) ?? [],
    hiddenUntilDependeciesMet: raw.mHiddenUntilDependenciesMet === 'true',
    cost: parseIngredients(raw.mCost, allItemsMap, null, 'in'),
    unlocks: raw.mUnlocks.flatMap(unlock => {
      const scripts = parseScriptsArray(
        unlock.mRecipes ?? unlock.mSchematics ?? '',
      );

      const type = unlock.Class.includes('Recipe')
        ? 'Recipe'
        : unlock.Class.includes('Schematic')
          ? 'Schematic'
          : null;

      if (!type) return [];

      return {
        type,
        scripts,
      };
    }),
  };
}

const sample1 = {
  ClassName: 'Schematic_StartingRecipes_C',
  FullName:
    'BlueprintGeneratedClass /Game/FactoryGame/Schematics/Schematic_StartingRecipes.Schematic_StartingRecipes_C',
  mType: 'EST_Custom',
  mDisplayName: 'Starting Blueprints',
  mDescription: '',
  mStatisticGameplayTag: '()',
  mSubCategories: '',
  mMenuPriority: '0.000000',
  mUnlockDescription: '',
  mTechTier: '0',
  mCost: '',
  mTimeToComplete: '0.000000',
  mRelevantShopSchematics: '',
  mIsPlayerSpecific: 'False',
  mUnlocks: [
    {
      Class: 'BP_UnlockRecipe_C',
      mRecipes:
        '("/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Recipes/Smelter/Recipe_IngotIron.Recipe_IngotIron_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Recipes/Constructor/Recipe_IronPlate.Recipe_IronPlate_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Recipes/Constructor/Recipe_IronRod.Recipe_IronRod_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Recipes/Buildings/Recipe_TradingPost.Recipe_TradingPost_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Recipes/Equipment/Recipe_XenoZapper.Recipe_XenoZapper_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Recipes/Buildings/Recipe_WorkBench.Recipe_WorkBench_C\'")',
    },
    {
      Class: 'BP_UnlockScannableResource_C',
      mResourcesToAddToScanner:
        '("/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Resource/RawResources/OreIron/Desc_OreIron.Desc_OreIron_C\'")',
      mResourcePairsToAddToScanner:
        '((ResourceDescriptor="/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Resource/RawResources/OreIron/Desc_OreIron.Desc_OreIron_C\'"))',
    },
    {
      Class: 'BP_UnlockEmote_C',
      mEmotes:
        '("/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Emotes/Emote_Clap.Emote_Clap_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Emotes/Emote_BuildGunSpin.Emote_BuildGunSpin_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Emotes/Emote_FacePalm.Emote_FacePalm_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Emotes/Emote_Rock.Emote_Rock_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Emotes/Emote_Paper.Emote_Paper_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Emotes/Emote_Scissors.Emote_Scissors_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Emotes/Emote_Point.Emote_Point_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Emotes/Emote_Wave.Emote_Wave_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Emotes/Emote_Heart.Emote_Heart_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Emotes/Emote_ThumbsUp.Emote_ThumbsUp_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Emotes/Emote_ThumbsDown.Emote_ThumbsDown_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Emotes/Emote_Fingerguns.Emote_Fingerguns_C\'")',
    },
    {
      Class: 'BP_UnlockSchematic_C',
      mSchematics:
        '("/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Schematics/Progression/Schematic_5-4-1.Schematic_5-4-1_C\'")',
    },
  ],
  mSchematicIcon:
    '(DrawAs=Image,ImageSize=(X=32.000000,Y=32.000000),Margin=(),TintColor=(SpecifiedColor=(R=1.000000,G=1.000000,B=1.000000,A=1.000000)),OutlineSettings=(CornerRadii=(X=0.000000,Y=0.000000,Z=0.000000,W=1.000000),Color=(SpecifiedColor=(R=0.000000,G=0.000000,B=0.000000,A=0.000000)),RoundingType=HalfHeightRadius),UVRegion=(Min=(X=0.000000,Y=0.000000),Max=(X=0.000000,Y=0.000000),bIsValid=False))',
  mSmallSchematicIcon: 'None',
  mSchematicDependencies: [
    {
      Class: 'BP_SchematicPurchasedDependency_C',
      mSchematics:
        '("/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Schematics/Progression/Schematic_5-1.Schematic_5-1_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Schematics/Alternate/Parts/Schematic_Alternate_EnrichedCoal.Schematic_Alternate_EnrichedCoal_C\'")',
      mRequireAllSchematicsToBePurchased: 'True',
    },
  ],
  mDependenciesBlocksSchematicAccess: 'False',
  mHiddenUntilDependenciesMet: 'False',
  mRelevantEvents: '',
  mSchematicUnlockTag: '()',
  mIncludeInBuilds: 'IIB_PublicBuilds',
};
const sample2 = {
  ClassName: 'Schematic_Alternate_TurboFuel_C',
  FullName:
    'BlueprintGeneratedClass /Game/FactoryGame/Schematics/Alternate/Parts/Schematic_Alternate_TurboFuel.Schematic_Alternate_TurboFuel_C',
  mType: 'EST_Custom',
  mDisplayName: 'Alternate: Turbofuel',
  mDescription: '',
  mStatisticGameplayTag: '()',
  mSubCategories: '',
  mMenuPriority: '0.000000',
  mTechTier: '6',
  mCost: '',
  mTimeToComplete: '0.000000',
  mRelevantShopSchematics: '',
  mIsPlayerSpecific: 'False',
  mUnlocks: [
    {
      Class: 'BP_UnlockRecipe_C',
      mRecipes:
        '("/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Recipes/AlternateRecipes/Parts/Recipe_Alternate_Turbofuel.Recipe_Alternate_Turbofuel_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Recipes/OilRefinery/Recipe_PackagedTurboFuel.Recipe_PackagedTurboFuel_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Recipes/OilRefinery/Recipe_UnpackageTurboFuel.Recipe_UnpackageTurboFuel_C\'")',
    },
  ],
  mSchematicIcon:
    '(DrawAs=Image,ImageSize=(X=256.000000,Y=256.000000),Margin=(),TintColor=(SpecifiedColor=(R=1.000000,G=1.000000,B=1.000000,A=1.000000)),OutlineSettings=(CornerRadii=(X=0.000000,Y=0.000000,Z=0.000000,W=1.000000),Color=(SpecifiedColor=(R=0.000000,G=0.000000,B=0.000000,A=0.000000)),RoundingType=HalfHeightRadius),ResourceObject="/Script/Engine.Texture2D\'/Game/FactoryGame/Buildable/Factory/TradingPost/UI/SchematicIcons/OldIcons/SchematicIcon_MAM.SchematicIcon_MAM\'",UVRegion=(Min=(X=0.000000,Y=0.000000),Max=(X=0.000000,Y=0.000000),bIsValid=False))',
  mSmallSchematicIcon: 'None',

  mDependenciesBlocksSchematicAccess: 'False',
  mHiddenUntilDependenciesMet: 'False',
  mRelevantEvents: '',
  mSchematicUnlockTag: '()',
  mIncludeInBuilds: 'IIB_PublicBuilds',
};
const sample3 = {
  ClassName: 'Schematic_5-4_C',
  FullName:
    'BlueprintGeneratedClass /Game/FactoryGame/Schematics/Progression/Schematic_5-4.Schematic_5-4_C',
  mType: 'EST_Milestone',
  mDisplayName: 'Fluid Packaging',
  mDescription: '',
  mStatisticGameplayTag: '(TagName="Stats.Gameplay.Schematics.Schematic5-4")',
  mSubCategories: '',
  mMenuPriority: '4.000000',
  mTechTier: '5',
  mCost:
    '((ItemClass="/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Resource/Parts/Plastic/Desc_Plastic.Desc_Plastic_C\'",Amount=200),(ItemClass="/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Resource/Parts/SteelPlate/Desc_SteelPlate.Desc_SteelPlate_C\'",Amount=400),(ItemClass="/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Resource/Parts/CopperSheet/Desc_CopperSheet.Desc_CopperSheet_C\'",Amount=1000))',
  mTimeToComplete: '300.000000',
  mRelevantShopSchematics: '',
  mIsPlayerSpecific: 'False',
  mUnlocks: [
    {
      Class: 'BP_UnlockRecipe_C',
      mRecipes:
        '("/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Recipes/Buildings/Recipe_Packager.Recipe_Packager_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Recipes/Constructor/Recipe_FluidCanister.Recipe_FluidCanister_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Recipes/OilRefinery/Recipe_PackagedWater.Recipe_PackagedWater_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Recipes/OilRefinery/Recipe_PackagedCrudeOil.Recipe_PackagedCrudeOil_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Recipes/OilRefinery/Recipe_Fuel.Recipe_Fuel_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Recipes/OilRefinery/Recipe_PackagedOilResidue.Recipe_PackagedOilResidue_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Recipes/OilRefinery/Recipe_PackagedBiofuel.Recipe_PackagedBiofuel_C\'","/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Recipes/OilRefinery/Recipe_LiquidBiofuel.Recipe_LiquidBiofuel_C\'")',
    },
    {
      Class: 'BP_UnlockSchematic_C',
      mSchematics:
        '("/Script/Engine.BlueprintGeneratedClass\'/Game/FactoryGame/Schematics/Progression/Schematic_5-4-1.Schematic_5-4-1_C\'")',
    },
  ],
  mSchematicIcon:
    '(DrawAs=Image,ImageSize=(X=256.000000,Y=256.000000),Margin=(),TintColor=(SpecifiedColor=(R=1.000000,G=1.000000,B=1.000000,A=1.000000)),OutlineSettings=(CornerRadii=(X=0.000000,Y=0.000000,Z=0.000000,W=1.000000),Color=(SpecifiedColor=(R=0.000000,G=0.000000,B=0.000000,A=0.000000)),RoundingType=HalfHeightRadius),ResourceObject="/Script/Engine.Texture2D\'/Game/FactoryGame/Buildable/Factory/TradingPost/UI/SchematicIcons/TXUI_SIcon_ProductionPackager.TXUI_SIcon_ProductionPackager\'",UVRegion=(Min=(X=0.000000,Y=0.000000),Max=(X=0.000000,Y=0.000000),bIsValid=False))',
  mSmallSchematicIcon: 'None',
  mSchematicDependencies: [],
  mDependenciesBlocksSchematicAccess: 'False',
  mHiddenUntilDependenciesMet: 'False',
  mRelevantEvents: '',
  mSchematicUnlockTag: '()',
  mIncludeInBuilds: 'IIB_PublicBuilds',
};
type RawSchematic = typeof sample1 & typeof sample2 & typeof sample3;
