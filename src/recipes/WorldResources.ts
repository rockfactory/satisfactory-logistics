export const WorldResources = {
  Desc_OreBauxite_C: {
    max: 12300,
  },
  Desc_OreGold_C: {
    max: 15000,
  },
  Desc_Coal_C: {
    max: 42300,
  },
  Desc_OreCopper_C: {
    max: 36900,
  },
  Desc_LiquidOil_C: {
    max: 12600,
  },
  Desc_OreIron_C: {
    max: 92100,
  },
  Desc_Stone_C: {
    max: 69900,
  },
  Desc_NitrogenGas_C: {
    max: 12000,
  },
  Desc_RawQuartz_C: {
    max: 13500,
  },
  Desc_Sulfur_C: {
    max: 10800,
  },
  Desc_OreUranium_C: {
    max: 2100,
  },
  Desc_SAM_C: {
    max: 10200,
    maxForWeight: 10200 / 10, // We want to highly discourage solver from using SAM, unless it's 10 times better
  },
  Desc_Water_C: {
    max: 1_000_000_000,
  },
};

export const getWorldResourceMax = (
  resource: string | null | undefined,
  type: 'weight' | 'availability' = 'availability',
) => {
  const resourceKey = resource as keyof typeof WorldResources;
  if (!resourceKey || !WorldResources[resourceKey]) {
    return 0;
  }

  const worldResource = WorldResources[resourceKey] as {
    max: number;
    maxForWeight?: number;
  };

  return type === 'weight'
    ? (worldResource.maxForWeight ?? worldResource.max)
    : worldResource.max;
};

export const WorldResourcesList = Object.keys(WorldResources);

export function isWorldResource(resource: string) {
  return resource in WorldResources;
}

/**
 * Bauxite	12300	9780	2520	25.77%
Caterium	15000	11040	3960	35.87%
Coal	42300	30900	11400	36.89%
Copper	36900	28860	8040	27.86%
Crude Oil	12600	11700	900	7.69%
Iron	92100	70380	21720	30.86%
Limestone	69900	52860	17040	32.24%
Nitrogen	12000	12300	-300	-2.44%
Quartz	13500	10500	3000	28.57%
Sulfur	10800	6840	3960	57.89%
Uranium	2100	2100	0	0%
SAM	10200	6900	3300	47.83%
 */
