import type { FactoryRecipe } from '@/recipes/FactoryRecipe';
import _ from 'lodash';
import { ParsingContext } from './ParsingContext';
import { normalizeResourceAmount } from './parseIngredients';

export function parseRecipesForPowerGenerators(docsJson: any) {
  const rawBuildings = docsJson.flatMap(nativeClass => {
    if (nativeClass.NativeClass?.includes('FGBuildableGenerator'))
      return nativeClass.Classes;
    return [];
  });

  rawBuildings.forEach(building => {
    parseBuildingForPowerRecipes(building);
  });
}

function parseBuildingForPowerRecipes(building: RawGenerator) {
  console.log(`Importing -> `, building.ClassName);
  if (!building.mFuel) {
    // e.g. geothermal
    return;
  }

  const powerProduction = parseFloat(building.mPowerProduction);
  const fuelLoadAmount = parseFloat(building.mFuelLoadAmount);

  building.mFuel.forEach(fuel => {
    const fuelItem = ParsingContext.itemsMap[fuel.mFuelClass];

    const burnTime =
      (fuelItem.energyValue * fuelLoadAmount) /
      parseFloat(building.mPowerProduction);

    const recipePowerProduction =
      (parseFloat(building.mPowerProduction) / 60) * burnTime;

    // water Per MW
    const originalSupplementalAmount =
      parseFloat(building.mSupplementalToPowerRatio) *
      powerProduction *
      burnTime;
    const recipeSupplementalAmount = normalizeResourceAmount(
      fuel.mSupplementalResourceClass,
      originalSupplementalAmount,
    );

    const originalFuelAmount = parseFloat(building.mFuelLoadAmount);
    const recipeFuelAmount = normalizeResourceAmount(
      fuel.mFuelClass,
      originalFuelAmount,
    );

    ParsingContext.recipes.push({
      index: _.last(ParsingContext.recipes)!.index + 1,
      id: `RecipeCustom_${building.ClassName}_${fuel.mFuelClass}`,
      name: `${building.mDisplayName}: ${fuelItem.displayName}`,
      powerConsumption: 0,
      powerConsumptionFactor: 0,
      producedIn: building.ClassName,
      time: burnTime,
      ingredients: [
        {
          resource: fuel.mFuelClass,
          amount: recipeFuelAmount,
          displayAmount: recipeFuelAmount,
          originalAmount: originalFuelAmount,
        },
        ...(fuel.mSupplementalResourceClass
          ? [
              {
                resource: fuel.mSupplementalResourceClass,
                amount: recipeSupplementalAmount,
                displayAmount: recipeSupplementalAmount,
                originalAmount: originalSupplementalAmount,
              },
            ]
          : []),
      ],
      products: [
        {
          resource: 'Desc_Power_CX',
          amount: recipePowerProduction,
          displayAmount: recipePowerProduction,
          originalAmount: recipePowerProduction,
        },
        ...(fuel.mByproduct
          ? [
              {
                resource: fuel.mByproduct,
                amount: (parseFloat(fuel.mByproductAmount) / 60) * burnTime,
                displayAmount:
                  (parseFloat(fuel.mByproductAmount) / 60) * burnTime,
                // TODO: Handle water if it's a byproduct, doesn't happen right now (1.0)
                originalAmount:
                  (parseFloat(fuel.mByproductAmount) / 60) * burnTime,
              },
            ]
          : []),
      ],
    } as FactoryRecipe);
  });
}

type RawGenerator = typeof sampleGenerator;

const sampleGenerator = {
  ClassName: 'Build_GeneratorCoal_C',
  m_SFXSockets: '("AudioSocketTurbine","CoalGeneratorPotential")',
  m_CurrentPotential: '1',
  mFuelClasses: '',
  mDefaultFuelClasses:
    '("/Game/FactoryGame/Resource/RawResources/Coal/Desc_Coal.Desc_Coal_C","/Game/FactoryGame/Resource/Parts/CompactedCoal/Desc_CompactedCoal.Desc_CompactedCoal_C","/Game/FactoryGame/Resource/Parts/PetroleumCoke/Desc_PetroleumCoke.Desc_PetroleumCoke_C")',
  mFuel: [
    {
      mFuelClass: 'Desc_Coal_C',
      mSupplementalResourceClass: 'Desc_Water_C',
      mByproduct: '',
      mByproductAmount: '',
    },
    {
      mFuelClass: 'Desc_CompactedCoal_C',
      mSupplementalResourceClass: 'Desc_Water_C',
      mByproduct: '',
      mByproductAmount: '',
    },
    {
      mFuelClass: 'Desc_PetroleumCoke_C',
      mSupplementalResourceClass: 'Desc_Water_C',
      mByproduct: '',
      mByproductAmount: '',
    },
  ],
  mAvailableFuelClasses: '',
  mFuelClassesInInventory: '',
  mFuelLoadAmount: '1',
  mRequiresSupplementalResource: 'True',
  mSupplementalLoadAmount: '1000',
  mSupplementalToPowerRatio: '10.000000',
  mIsFullBlast: 'True',
  mCachedInputConnections: '',
  mCachedPipeInputConnections: '',
  mPowerProduction: '75.000000',
  mLoadPercentage: '0.000000',
  mPowerConsumption: '0.000000',
  mPowerConsumptionExponent: '1.600000',
  mProductionBoostPowerConsumptionExponent: '2.000000',
  mDoesHaveShutdownAnimation: 'True',
  mOnHasPowerChanged: '()',
  mOnHasProductionChanged: '()',
  mOnHasStandbyChanged: '()',
  mOnPendingPotentialChanged: '()',
  mOnPendingProductionBoostChanged: '()',
  mOnCurrentProductivityChanged: '()',
  mMinimumProducingTime: '2.000000',
  mMinimumStoppedTime: '5.000000',
  mCanEverMonitorProductivity: 'True',
  mCanChangePotential: 'True',
  mCanChangeProductionBoost: 'False',
  mMinPotential: '0.010000',
  mMaxPotential: '1.000000',
  mBaseProductionBoost: '1.000000',
  mPotentialShardSlots: '0',
  mProductionShardSlotSize: '0',
  mProductionShardBoostMultiplier: '1.000000',
  mFluidStackSizeDefault: 'SS_FLUID',
  mFluidStackSizeMultiplier: '1',
  mHasInventoryPotential: 'True',
  mIsTickRateManaged: 'True',
  mEffectUpdateInterval: '0.000000',
  mDefaultProductivityMeasurementDuration: '300.000000',
  mLastProductivityMeasurementProduceDuration: '300.000000',
  mLastProductivityMeasurementDuration: '300.000000',
  mCurrentProductivityMeasurementProduceDuration: '0.000000',
  mCurrentProductivityMeasurementDuration: '0.000000',
  mProductivityMonitorEnabled: 'False',
  mOverridePotentialShardSlots: 'False',
  mOverrideProductionShardSlotSize: 'False',
  mAddToSignificanceManager: 'True',
  mAlienOverClockingParticleEffects: '',
  mCachedSkeletalMeshes: '',
  mSignificanceRange: '20000.000000',
  mTickExponent: '5.000000',
  mDisplayName: 'Coal-Powered Generator',
  mDescription:
    'Burns Coal to boil Water. The steam produced rotates turbines that generate electricity for the power grid.\r\nHas Conveyor Belt and Pipeline input ports that allow the Coal and Water supply to be automated.\r\n\r\nCaution: Always generates power at the set clock speed. Shuts down if fuel requirements are not met.',
  MaxRenderDistance: '-1.000000',
  mAlternativeMaterialRecipes: '',
  mContainsComponents: 'True',
  mIsConsideredForBaseWeightValue: '1.000000',
  bForceLegacyBuildEffect: 'False',
  bForceBuildEffectSolo: 'False',
  mBuildEffectSpeed: '0.000000',
  mAllowColoring: 'True',
  mAllowPatterning: 'True',
  mInteractionRegisterPlayerWithCircuit: 'True',
  mSkipBuildEffect: 'False',
  mForceNetUpdateOnRegisterPlayer: 'False',
  mToggleDormancyOnInteraction: 'False',
  mIsMultiSpawnedBuildable: 'False',
  mShouldShowAttachmentPointVisuals: 'False',
  mCanContainLightweightInstances: 'False',
  mManagedByLightweightBuildableSubsystem: 'False',
  mRemoveBuildableFromSubsystemOnDismantle: 'False',
  mHasBeenRemovedFromSubsystem: 'False',
  mAffectsOcclusion: 'False',
  mOcclusionShape: 'ROCS_Box',
  mScaleCustomOffset: '1.000000',
  mCustomScaleType: 'ROCSS_Center',
  mOcclusionBoxInfo: '',
  mAttachmentPoints: '',
  mReplicatedBuiltInsideBlueprintDesigner: 'False',
  mInteractingPlayers: '',
  mIsUseable: 'True',
  mClearanceData:
    '((ClearanceBox=(Min=(X=-500.000000,Y=-1350.000000,Z=0.000000),Max=(X=500.000000,Y=1250.000000,Z=900.000000),IsValid=True)),(ClearanceBox=(Min=(X=-60.000000,Y=-50.000000,Z=0.000000),Max=(X=200.000000,Y=200.000000,Z=2300.000000),IsValid=True),RelativeTransform=(Translation=(X=-348.724685,Y=800.000000,Z=900.000000)),ExcludeForSnapping=True),(Type=CT_Soft,ClearanceBox=(Min=(X=-20.000000,Y=-20.000000,Z=0.000000),Max=(X=20.000000,Y=20.000000,Z=200.000000),IsValid=True),RelativeTransform=(Translation=(X=265.000000,Y=-1275.000000,Z=900.000000)),ExcludeForSnapping=True),(Type=CT_Soft,ClearanceBox=(Min=(X=-30.000000,Y=-30.000000,Z=0.000000),Max=(X=30.000000,Y=30.000000,Z=75.000000),IsValid=True),RelativeTransform=(Translation=(X=-265.000000,Y=-1300.000000,Z=900.000000)),ExcludeForSnapping=True))',
  mHideOnBuildEffectStart: 'False',
  mShouldModifyWorldGrid: 'True',
  mTimelapseBucketId: '0',
  mTimelapseDelay: '0.000000',
  mAlienOverClockingZOffset: '0.000000',
  mAlienOverClockingAttenuationScalingFactor: '12.000000',
  mAlienOverClockingVolumeDB_RTPC: '0.000000',
  mAlienOverClockingHighpass_RTPC: '0.000000',
  mAlienOverClockingPitch_RTPC: '0.000000',
  mBlueprintBuildEffectID: '-1',
};
