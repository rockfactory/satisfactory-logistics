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
  isClean: boolean;
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

function bestTransport(totalRate: number, isFluid: boolean) {
  const tiers = getTransportTiers(isFluid);
  for (const tier of tiers) {
    if (totalRate <= tier.speed) {
      return {
        name: tier.name,
        speed: tier.speed,
        count: 1,
        isClean: isCleanRate(totalRate, tier.speed),
      };
    }
  }
  const max = tiers[tiers.length - 1];
  const count = Math.ceil(totalRate / max.speed);
  return {
    name: max.name,
    speed: max.speed,
    count,
    isClean: isCleanRate(totalRate, max.speed),
  };
}

function isCleanRate(totalRate: number, beltSpeed: number): boolean {
  const tolerance = 0.001;
  const ratio = totalRate / beltSpeed;
  return Math.abs(ratio - Math.round(ratio)) < tolerance;
}

/**
 * Rates that are clean fractions of a belt speed are easy to split/merge.
 * e.g., 1/1, 1/2, 1/3, 2/3 of a belt = one splitter/merger stage.
 */
const CLEAN_FRACTIONS = [1, 1 / 2, 1 / 3, 2 / 3];
const TOLERANCE = 0.002;

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

function scoreBankOption(lines: BankLine[], machineCount: number, totalMachines: number): number {
  let score = 0;

  for (const line of lines) {
    const isInput = line.type === 'ingredient';
    const friendly = trunkFriendliness(line.totalRate, line.isFluid);

    if (isInput) {
      // Must fit on 1 belt, ideally a clean split from a trunk
      if (line.transportsNeeded === 1) score += 25;
      else if (line.transportsNeeded === 2) score -= 10;
      else score -= 25;

      score += friendly;
    } else {
      // Outputs: reward clean merge-back into trunk
      score += friendly;
      if (line.transportsNeeded <= 2) score += 3;
    }
  }

  if (totalMachines > 0 && totalMachines % machineCount === 0) {
    score += 15;
  }

  if (totalMachines > 0) {
    const banksNeeded = Math.ceil(totalMachines / machineCount);
    if (banksNeeded > 16) score -= 30;
    else if (banksNeeded > 8) score -= 15;
    else if (banksNeeded > 4) score -= 5;
  }

  return score;
}

const OVERCLOCK_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5];

interface BaseLineInfo {
  resource: string;
  displayName: string;
  baseRate: number;
  type: 'ingredient' | 'product';
  isFluid: boolean;
}

function buildBaseLines(recipe: FactoryRecipe): BaseLineInfo[] {
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
      baseRate: (prod.displayAmount * 60) / recipe.time,
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

export function computeBeltFriendlyBanks(
  recipe: FactoryRecipe,
  currentOverclock: number = 1,
  totalMachines: number = 0,
  maxBankSize: number = 32,
): BankOption[] {
  const baseLines = buildBaseLines(recipe);
  const building = AllFactoryBuildingsMap[recipe.producedIn];
  const roundedTotal = Math.ceil(totalMachines - 0.0001);

  const basePower = computeTotalPower(building, roundedTotal, currentOverclock);

  const options: BankOption[] = [];

  for (const oc of OVERCLOCK_STEPS) {
    const scaledTotalMachines =
      roundedTotal > 0
        ? Math.ceil(roundedTotal * (currentOverclock / oc) - 0.0001)
        : 0;

    const totalPower = computeTotalPower(building, scaledTotalMachines, oc);
    const powerDelta = totalPower - basePower;

    const powerRatio = basePower > 0 ? totalPower / basePower : 1;

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
          isClean: transport.isClean,
          isFluid: bl.isFluid,
        };
      });

      const banksNeeded =
        scaledTotalMachines > 0 ? Math.ceil(scaledTotalMachines / n) : 0;
      let score = scoreBankOption(lines, n, scaledTotalMachines);

      if (oc === currentOverclock) score += 5;
      score += (oc - 1) * 3;

      if (powerRatio > 1) {
        score -= (powerRatio - 1) * 10;
      } else if (powerRatio < 1) {
        score += (1 - powerRatio) * 5;
      }

      options.push({
        machineCount: n,
        banksNeeded,
        overclock: oc,
        totalPower,
        powerDelta,
        score,
        lines,
      });
    }
  }

  options.sort((a, b) => b.score - a.score);

  return diversifyResults(options);
}

function diversifyResults(sorted: BankOption[], maxResults = 8): BankOption[] {
  const result: BankOption[] = [];
  const seenOverclocks = new Map<number, number>();

  for (const opt of sorted) {
    if (result.length >= maxResults) break;
    const ocCount = seenOverclocks.get(opt.overclock) ?? 0;
    if (ocCount >= 3) continue;
    seenOverclocks.set(opt.overclock, ocCount + 1);
    result.push(opt);
  }

  return result;
}
