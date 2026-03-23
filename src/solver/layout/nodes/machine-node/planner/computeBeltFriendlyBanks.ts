import {
  AllFactoryBuildingsMap,
  FactoryConveyorBelts,
  FactoryPipelinesExclAlternates,
} from '@/recipes/FactoryBuilding';
import { AllFactoryItemsMap, FactoryItemForm } from '@/recipes/FactoryItem';
import type { FactoryRecipe } from '@/recipes/FactoryRecipe';

const BELT_SPEEDS = FactoryConveyorBelts.map(b => ({
  name: b.name,
  speed: b.conveyor!.speed,
})).sort((a, b) => a.speed - b.speed);

const PIPE_FLOW_RATES = FactoryPipelinesExclAlternates.map(p => ({
  name: p.name,
  speed: p.pipeline!.flowRate,
})).sort((a, b) => a.speed - b.speed);

export interface BankLine {
  resource: string;
  displayName: string;
  type: 'ingredient' | 'product';
  perBuilding: number;
  totalRate: number;
  transportName: string;
  transportSpeed: number;
  transportsNeeded: number;
  splitLabel: string | null;
  isFluid: boolean;
}

export interface BankOption {
  machineCount: number;
  banksNeeded: number;
  overclock: number;
  totalPower: number;
  powerDelta: number;
  score: number;
  lines: BankLine[];
}

function getTransportTiers(isFluid: boolean) {
  return isFluid ? PIPE_FLOW_RATES : BELT_SPEEDS;
}

/**
 * Rates that are clean fractions of a belt speed are easy to split/merge.
 * e.g., 1/1, 1/2, 1/3, 2/3 of a belt = one splitter/merger stage.
 */
const CLEAN_FRACTIONS = [1, 1 / 2, 1 / 3];
const TOLERANCE = 0.0005;


const FRACTION_LABELS: { frac: number; label: string }[] = [
  { frac: 1, label: 'Full' },
  { frac: 1 / 2, label: '1/2' },
  { frac: 1 / 3, label: '1/3' },
  { frac: 2 / 3, label: '2/3' },
];

function describeSplit(totalRate: number, isFluid: boolean): string | null {
  const tiers = getTransportTiers(isFluid);
  for (const tier of tiers) {
    if (totalRate > tier.speed) continue;
    const ratio = totalRate / tier.speed;
    for (const { frac, label } of FRACTION_LABELS) {
      if (Math.abs(ratio - frac) < TOLERANCE) {
        return label;
      }
    }
    break;
  }
  return null;
}

function bestTransport(totalRate: number, isFluid: boolean) {
  const splitLabel = describeSplit(totalRate, isFluid);
  const tiers = getTransportTiers(isFluid);
  for (const tier of tiers) {
    if (totalRate <= tier.speed) {
      return {
        name: tier.name,
        speed: tier.speed,
        count: 1,
        splitLabel,
      };
    }
  }
  const max = tiers[tiers.length - 1];
  const count = Math.ceil(totalRate / max.speed);
  return {
    name: max.name,
    speed: max.speed,
    count,
    splitLabel,
  };
}

function trunkFriendliness(totalRate: number, isFluid: boolean): number {
  const tiers = getTransportTiers(isFluid);
  let best = 0;
  for (const tier of tiers) {
    if (totalRate > tier.speed) continue;
    const ratio = totalRate / tier.speed;
    for (const frac of CLEAN_FRACTIONS) {
      if (Math.abs(ratio - frac) < TOLERANCE) {
        // Exact match is best; 1/1 (full belt) is ideal
        const fracScore = frac === 1 ? 20 : frac >= 0.5 ? 15 : 10;
        best = Math.max(best, fracScore);
      }
    }
    if (best > 0) break;
  }
  return best;
}

export type PlannerPriority = 'logistics' | 'power' | 'buildings';

function exactBeltMatch(totalRate: number, isFluid: boolean): number {
  const tiers = getTransportTiers(isFluid);
  for (const tier of tiers) {
    if (Math.abs(totalRate - tier.speed) < TOLERANCE) return 40;
  }
  return 0;
}

function outputBeltScore(totalRate: number, isFluid: boolean): number {
  const tiers = getTransportTiers(isFluid);
  for (const tier of tiers) {
    if (totalRate > tier.speed) continue;
    const ratio = totalRate / tier.speed;
    for (const frac of CLEAN_FRACTIONS) {
      if (Math.abs(ratio - frac) < TOLERANCE) {
        // Full belt = best, half belt = nearly as good, thirds = good
        if (frac === 1) return 120;
        if (frac >= 0.5) return 100;
        return 70;
      }
    }
    break;
  }
  return 0;
}

function scoreBankOption(lines: BankLine[], machineCount: number, totalMachines: number): number {
  let score = 0;

  for (const line of lines) {
    const isInput = line.type === 'ingredient';

    if (isInput) {
      const friendly = trunkFriendliness(line.totalRate, line.isFluid);
      const exactBelt = exactBeltMatch(line.totalRate, line.isFluid);

      if (line.transportsNeeded === 1) score += 25;
      else if (line.transportsNeeded === 2) score -= 10;
      else score -= 25;

      score += friendly;
      if (exactBelt > 0) score += 10;
    } else {
      // Output belt alignment is the PRIMARY driver of bank sizing.
      // Full belt, half belt, and third belt are all excellent for merging.
      score += outputBeltScore(line.totalRate, line.isFluid);
      if (line.transportsNeeded === 1) score += 15;
      else if (line.transportsNeeded <= 2) score += 5;
    }
  }

  if (totalMachines > 0 && totalMachines % machineCount === 0) {
    score += 15;
  }

  if (totalMachines > 0) {
    const banksNeeded = Math.ceil(totalMachines / machineCount);
    if (banksNeeded > 16) score -= 15 + banksNeeded * 2;
    else if (banksNeeded > 8) score -= 15;
    else if (banksNeeded > 4) score -= 5;
  }

  if (machineCount <= 2 && totalMachines > 10) {
    score -= 40;
  }

  return score;
}

export function computeBestBankSize(
  recipe: FactoryRecipe,
  overclock: number,
  totalMachines: number,
  amplifiedRate = 1,
): { machineCount: number; banksNeeded: number } | null {
  const roundedTotal = Math.ceil(totalMachines - 0.0001);
  if (roundedTotal <= 1) return null;

  const baseLines = buildBaseLines(recipe, amplifiedRate);
  const maxBankSize = Math.min(Math.max(roundedTotal, 32), 64);

  let bestScore = -Infinity;
  let bestOption: { machineCount: number; banksNeeded: number } | null = null;

  for (let n = 1; n <= maxBankSize; n++) {
    const lines: BankLine[] = baseLines.map(bl => {
      const perBuilding = bl.baseRate * overclock;
      const totalRate = perBuilding * n;
      const transport = bestTransport(totalRate, bl.isFluid);
      return {
        resource: bl.resource,
        displayName: bl.displayName,
        type: bl.type,
        perBuilding,
        totalRate,
        transportName: transport.name,
        transportSpeed: transport.speed,
        transportsNeeded: transport.count,
        splitLabel: transport.splitLabel,
        isFluid: bl.isFluid,
      };
    });

    const banksNeeded = Math.ceil(roundedTotal / n);
    if (banksNeeded <= 1) continue;

    const score = scoreBankOption(lines, n, roundedTotal);
    if (score > bestScore) {
      bestScore = score;
      bestOption = { machineCount: n, banksNeeded };
    }
  }

  return bestOption;
}

function generateCoarseSteps(): number[] {
  const steps: number[] = [];
  for (let pct = 50; pct <= 250; pct += 5) {
    steps.push(pct / 100);
  }
  return steps;
}

function generateRefineSteps(center: number, halfRange = 0.05, step = 0.001): number[] {
  const steps: number[] = [];
  const lo = Math.max(0.5, center - halfRange);
  const hi = Math.min(2.5, center + halfRange);
  for (let v = lo; v <= hi + 1e-9; v += step) {
    steps.push(Math.round(v * 1000) / 1000);
  }
  return steps;
}

interface BaseLineInfo {
  resource: string;
  displayName: string;
  baseRate: number;
  type: 'ingredient' | 'product';
  isFluid: boolean;
}

function buildBaseLines(recipe: FactoryRecipe, amplifiedRate = 1): BaseLineInfo[] {
  const lines: BaseLineInfo[] = [];
  for (const ing of recipe.ingredients) {
    const item = AllFactoryItemsMap[ing.resource];
    lines.push({
      resource: ing.resource,
      displayName: item?.displayName ?? ing.resource,
      baseRate: (ing.displayAmount * 60) / recipe.time,
      type: 'ingredient',
      isFluid: item?.form === FactoryItemForm.Liquid,
    });
  }
  for (const prod of recipe.products) {
    const item = AllFactoryItemsMap[prod.resource];
    lines.push({
      resource: prod.resource,
      displayName: item?.displayName ?? prod.resource,
      baseRate: ((prod.displayAmount * 60) / recipe.time) * amplifiedRate,
      type: 'product',
      isFluid: item?.form === FactoryItemForm.Liquid,
    });
  }
  return lines;
}

function computeTotalPower(
  building: { powerConsumption: number; powerConsumptionExponent: number },
  numMachines: number,
  overclock: number,
): number {
  return (
    numMachines *
    building.powerConsumption *
    Math.pow(overclock, building.powerConsumptionExponent)
  );
}

const PRIORITY_WEIGHTS: Record<
  PlannerPriority,
  { logistics: number; power: number; buildings: number }
> = {
  logistics: { logistics: 1.0, power: 0.3, buildings: 0.2 },
  power: { logistics: 0.4, power: 1.0, buildings: 0.3 },
  buildings: { logistics: 0.4, power: 0.2, buildings: 1.0 },
};

interface SearchContext {
  baseLines: BaseLineInfo[];
  building: { powerConsumption: number; powerConsumptionExponent: number };
  roundedTotal: number;
  currentOverclock: number;
  basePower: number;
  weights: { logistics: number; power: number; buildings: number };
  maxBankSize: number;
  targetBanks: number;
}

function evaluateOverclock(ctx: SearchContext, oc: number): BankOption[] {
  const { baseLines, building, roundedTotal, currentOverclock, basePower, weights, maxBankSize, targetBanks } = ctx;

  const scaledTotalMachines =
    roundedTotal > 0
      ? Math.ceil(roundedTotal * (currentOverclock / oc) - 0.0001)
      : 0;

  const totalPower = computeTotalPower(building, scaledTotalMachines, oc);
  const powerDelta = totalPower - basePower;
  const powerRatio = basePower > 0 ? totalPower / basePower : 1;

  const results: BankOption[] = [];

  for (let n = 1; n <= maxBankSize; n++) {
    const lines: BankLine[] = baseLines.map(bl => {
      const perBuilding = bl.baseRate * oc;
      const totalRate = perBuilding * n;
      const transport = bestTransport(totalRate, bl.isFluid);
      return {
        resource: bl.resource,
        displayName: bl.displayName,
        type: bl.type,
        perBuilding,
        totalRate,
        transportName: transport.name,
        transportSpeed: transport.speed,
        transportsNeeded: transport.count,
        splitLabel: transport.splitLabel,
        isFluid: bl.isFluid,
      };
    });

    const banksNeeded =
      scaledTotalMachines > 0 ? Math.ceil(scaledTotalMachines / n) : 0;

    const logisticsScore = scoreBankOption(lines, n, scaledTotalMachines);

    let powerScore = 0;
    if (powerRatio > 1) {
      powerScore -= (powerRatio - 1) * 30;
    } else if (powerRatio < 1) {
      powerScore += (1 - powerRatio) * 30;
    }

    let buildingsScore = 0;
    if (roundedTotal > 0 && scaledTotalMachines > 0) {
      const reduction = 1 - scaledTotalMachines / roundedTotal;
      buildingsScore += reduction * 50;
    }

    let score =
      logisticsScore * weights.logistics +
      powerScore * weights.power +
      buildingsScore * weights.buildings;

    if (targetBanks > 0 && banksNeeded > 0) {
      if (banksNeeded === targetBanks) {
        score += 500;
      } else if (targetBanks % banksNeeded === 0 || banksNeeded % targetBanks === 0) {
        score += 200;
      } else {
        const diff = Math.abs(banksNeeded - targetBanks);
        score -= diff * 20;
      }
    }

    if (oc === currentOverclock) score += 5;

    // Prefer clean overclock percentages (whole %) over fractional ones
    const ocPct = oc * 100;
    if (Math.abs(ocPct - Math.round(ocPct)) < 0.01) score += 3;
    else if (Math.abs(ocPct * 2 - Math.round(ocPct * 2)) < 0.01) score += 1;

    results.push({
      machineCount: n,
      banksNeeded,
      overclock: oc,
      totalPower,
      powerDelta,
      score,
      lines,
    });
  }

  return results;
}

export function computeBeltFriendlyBanks(
  recipe: FactoryRecipe,
  currentOverclock: number = 1,
  totalMachines: number = 0,
  maxBankSize: number = 32,
  priority: PlannerPriority = 'logistics',
  amplifiedRate = 1,
  targetBanks = 0,
): BankOption[] {
  const baseLines = buildBaseLines(recipe, amplifiedRate);
  const building = AllFactoryBuildingsMap[recipe.producedIn];
  const roundedTotal = Math.ceil(totalMachines - 0.0001);
  const weights = PRIORITY_WEIGHTS[priority];
  const basePower = computeTotalPower(building, roundedTotal, currentOverclock);

  const ctx: SearchContext = {
    baseLines, building, roundedTotal, currentOverclock, basePower, weights, maxBankSize, targetBanks,
  };

  // Phase 1: coarse search at 5% steps
  const coarseOptions: BankOption[] = [];
  for (const oc of generateCoarseSteps()) {
    coarseOptions.push(...evaluateOverclock(ctx, oc));
  }
  coarseOptions.sort((a, b) => b.score - a.score);

  // Collect top overclock neighborhoods to refine
  const topOverclocks = new Set<number>();
  for (const opt of coarseOptions) {
    topOverclocks.add(opt.overclock);
    if (topOverclocks.size >= 3) break;
  }

  // Phase 2: refine around top overclocks at 0.1% precision
  const refinedOptions: BankOption[] = [...coarseOptions];
  const seenOc = new Set(generateCoarseSteps().map(v => Math.round(v * 1000)));
  for (const center of topOverclocks) {
    for (const oc of generateRefineSteps(center)) {
      const key = Math.round(oc * 1000);
      if (seenOc.has(key)) continue;
      seenOc.add(key);
      refinedOptions.push(...evaluateOverclock(ctx, oc));
    }
  }

  refinedOptions.sort((a, b) => b.score - a.score);

  return diversifyResults(refinedOptions);
}

function diversifyResults(sorted: BankOption[], maxResults = 8): BankOption[] {
  const result: BankOption[] = [];
  const seenOverclocks = new Map<number, number>();
  const seenBankSizes = new Set<number>();

  for (const opt of sorted) {
    if (result.length >= maxResults) break;

    // Bucket overclocks to nearest 1% to avoid near-duplicate suggestions
    const ocBucket = Math.round(opt.overclock * 100);
    const ocCount = seenOverclocks.get(ocBucket) ?? 0;
    if (ocCount >= 3) continue;

    // Skip if we already have this bank size (a different overclock variant)
    if (seenBankSizes.has(opt.machineCount)) continue;

    seenOverclocks.set(ocBucket, ocCount + 1);
    seenBankSizes.add(opt.machineCount);
    result.push(opt);
  }

  return result;
}
