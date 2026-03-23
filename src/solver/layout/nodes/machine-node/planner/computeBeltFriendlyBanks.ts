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

export type PlannerPriority = 'logistics' | 'power' | 'buildings';

// --- Formula-based anchor computation ---

function getMaxTransportSpeed(isFluid: boolean): number {
  const tiers = getTransportTiers(isFluid);
  return tiers[tiers.length - 1].speed;
}

/**
 * k = min(floor(B / r_i)) across all inputs.
 * The largest block size where every input fits on a single max-tier belt.
 */
function computeAnchorBlockSize(
  baseLines: BaseLineInfo[],
  overclock: number,
): number {
  let k = Infinity;
  for (const bl of baseLines) {
    if (bl.type !== 'ingredient') continue;
    const rate = bl.baseRate * overclock;
    const maxBelt = getMaxTransportSpeed(bl.isFluid);
    const maxMachines = Math.floor(maxBelt / rate);
    if (maxMachines < k) k = maxMachines;
  }
  return k === Infinity ? 64 : Math.max(k, 1);
}

/**
 * For each product, find block sizes where output is a clean fraction of
 * any belt tier (full, 1/2, 1/3).
 */
function computeOutputAlignedSizes(
  baseLines: BaseLineInfo[],
  overclock: number,
  maxBankSize: number,
): number[] {
  const sizes = new Set<number>();
  for (const bl of baseLines) {
    if (bl.type !== 'product') continue;
    const rate = bl.baseRate * overclock;
    if (rate <= 0) continue;
    const tiers = getTransportTiers(bl.isFluid);
    for (const tier of tiers) {
      for (const frac of CLEAN_FRACTIONS) {
        const n = Math.floor((tier.speed * frac) / rate);
        if (n >= 1 && n <= maxBankSize) sizes.add(n);
      }
    }
  }
  return [...sizes];
}

/**
 * Generate a focused set of candidate block sizes from the anchor
 * and output-aligned sizes.
 */
function generateCandidates(
  anchorK: number,
  outputAligned: number[],
  totalMachines: number,
  maxBankSize: number,
): number[] {
  const candidates = new Set<number>();

  candidates.add(anchorK);

  for (let d = 2; d <= 8; d++) {
    if (anchorK % d === 0) candidates.add(anchorK / d);
    const multiple = anchorK * d;
    if (multiple <= maxBankSize) candidates.add(multiple);
  }

  for (const n of outputAligned) {
    candidates.add(n);
    if (n % 2 === 0) candidates.add(n / 2);
    if (n % 3 === 0) candidates.add(n / 3);
  }

  for (
    let n = Math.max(1, anchorK - 4);
    n <= Math.min(maxBankSize, anchorK + 4);
    n++
  ) {
    candidates.add(n);
  }

  if (totalMachines > 1) {
    for (let n = 2; n <= maxBankSize; n++) {
      if (totalMachines % n === 0) candidates.add(n);
    }
  }

  return [...candidates]
    .filter(n => n >= 1 && n <= maxBankSize)
    .sort((a, b) => a - b);
}

// --- Formula-based ranking ---

/**
 * How cleanly does a rate fit a belt tier? Returns a score reflecting
 * the best clean-fraction match across all available transport tiers.
 * Full belt > 1/2 belt > 1/3 belt > no match.
 */
function beltUtilization(totalRate: number, isFluid: boolean): number {
  const tiers = getTransportTiers(isFluid);
  let best = 0;
  for (const tier of tiers) {
    if (totalRate > tier.speed) continue;
    const ratio = totalRate / tier.speed;
    for (const frac of CLEAN_FRACTIONS) {
      if (Math.abs(ratio - frac) < TOLERANCE) {
        const s = frac === 1 ? 100 : frac >= 0.5 ? 80 : 60;
        if (s > best) best = s;
      }
    }
  }
  return best;
}

/**
 * Deterministic ranking of a candidate block size based on:
 * 1. Input constraint: does machineCount <= anchorK? (single-belt inputs)
 * 2. Output belt utilization: how cleanly outputs fill belt tiers
 * 3. Number of belts needed for inputs (fewer is better)
 * 4. Remainder minimization and practical bank-count constraints
 */
function rankCandidate(
  lines: BankLine[],
  machineCount: number,
  totalMachines: number,
  anchorK: number,
): number {
  let score = 0;

  // Primary: input constraint — does every input fit on one belt?
  if (machineCount <= anchorK) {
    score += 1000;
  }

  // Secondary: output belt utilization is the main driver of bank sizing
  for (const line of lines) {
    if (line.type === 'product') {
      score += beltUtilization(line.totalRate, line.isFluid) * 3;
      if (line.transportsNeeded === 1) score += 20;
    }
  }

  // Input quality: single-belt inputs with clean splits are better
  for (const line of lines) {
    if (line.type !== 'ingredient') continue;
    if (line.transportsNeeded === 1) score += 30;
    else score -= 50 * (line.transportsNeeded - 1);
    score += beltUtilization(line.totalRate, line.isFluid);
  }

  // Remainder minimization: prefer sizes that evenly divide total machines
  if (totalMachines > 0) {
    if (totalMachines % machineCount === 0) {
      score += 50;
    } else {
      const remainder = totalMachines % machineCount;
      if (remainder >= machineCount / 2) score += 15;
    }
  }

  // Practical bank-count constraints
  if (totalMachines > 0) {
    const banksNeeded = Math.ceil(totalMachines / machineCount);
    if (banksNeeded > 16) score -= 30 + banksNeeded * 2;
    else if (banksNeeded > 8) score -= 20;
  }

  if (machineCount <= 2 && totalMachines > 10) {
    score -= 100;
  }

  return score;
}

// --- Data helpers ---

interface BaseLineInfo {
  resource: string;
  displayName: string;
  baseRate: number;
  type: 'ingredient' | 'product';
  isFluid: boolean;
}

function buildBaseLines(
  recipe: FactoryRecipe,
  amplifiedRate = 1,
): BaseLineInfo[] {
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

function buildBankLines(
  baseLines: BaseLineInfo[],
  oc: number,
  n: number,
): BankLine[] {
  return baseLines.map(bl => {
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
}

function computeTotalPower(
  building: { powerConsumption: number; powerConsumptionExponent: number },
  numMachines: number,
  overclock: number,
): number {
  return (
    numMachines *
    building.powerConsumption *
    overclock ** building.powerConsumptionExponent
  );
}

// --- Best bank for popover (current config only) ---

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

  const anchorK = computeAnchorBlockSize(baseLines, overclock);
  const outputAligned = computeOutputAlignedSizes(
    baseLines,
    overclock,
    maxBankSize,
  );
  const candidates = generateCandidates(
    anchorK,
    outputAligned,
    roundedTotal,
    maxBankSize,
  );

  let bestScore = -Infinity;
  let bestOption: { machineCount: number; banksNeeded: number } | null = null;

  for (const n of candidates) {
    const banksNeeded = Math.ceil(roundedTotal / n);
    if (banksNeeded <= 1) continue;

    const lines = buildBankLines(baseLines, overclock, n);
    const score = rankCandidate(lines, n, roundedTotal, anchorK);
    if (score > bestScore) {
      bestScore = score;
      bestOption = { machineCount: n, banksNeeded };
    }
  }

  return bestOption;
}

// --- Overclock search ---

function generateCoarseSteps(): number[] {
  const steps: number[] = [];
  for (let pct = 50; pct <= 250; pct += 5) {
    steps.push(pct / 100);
  }
  return steps;
}

function generateRefineSteps(
  center: number,
  halfRange = 0.05,
  step = 0.001,
): number[] {
  const steps: number[] = [];
  const lo = Math.max(0.5, center - halfRange);
  const hi = Math.min(2.5, center + halfRange);
  for (let v = lo; v <= hi + 1e-9; v += step) {
    steps.push(Math.round(v * 1000) / 1000);
  }
  return steps;
}

interface SearchContext {
  baseLines: BaseLineInfo[];
  building: { powerConsumption: number; powerConsumptionExponent: number };
  roundedTotal: number;
  currentOverclock: number;
  basePower: number;
  priority: PlannerPriority;
  maxBankSize: number;
  targetBanks: number;
}

function evaluateOverclock(ctx: SearchContext, oc: number): BankOption[] {
  const {
    baseLines,
    building,
    roundedTotal,
    currentOverclock,
    basePower,
    priority,
    maxBankSize,
    targetBanks,
  } = ctx;

  const scaledTotalMachines =
    roundedTotal > 0
      ? Math.ceil(roundedTotal * (currentOverclock / oc) - 0.0001)
      : 0;

  const totalPower = computeTotalPower(building, scaledTotalMachines, oc);
  const powerDelta = totalPower - basePower;
  const powerRatio = basePower > 0 ? totalPower / basePower : 1;

  const anchorK = computeAnchorBlockSize(baseLines, oc);
  const outputAligned = computeOutputAlignedSizes(baseLines, oc, maxBankSize);
  const candidates = generateCandidates(
    anchorK,
    outputAligned,
    scaledTotalMachines,
    maxBankSize,
  );

  const results: BankOption[] = [];

  for (const n of candidates) {
    const lines = buildBankLines(baseLines, oc, n);
    const banksNeeded =
      scaledTotalMachines > 0 ? Math.ceil(scaledTotalMachines / n) : 0;

    // The formula-based logistics score is always the foundation
    const logisticsScore = rankCandidate(
      lines,
      n,
      scaledTotalMachines,
      anchorK,
    );

    let score = logisticsScore;

    if (priority === 'power') {
      // P_total ∝ c^0.6 — lower clock = lower total power.
      // Score is proportional to how much power is saved vs current config.
      // Normalized so that 50% clock (c^0.6 ≈ 0.66) gets a large bonus.
      const powerFactor = oc ** 0.6;
      const baseFactor = currentOverclock ** 0.6;
      const savings = (baseFactor - powerFactor) / baseFactor;
      score += savings * 500;
    } else if (priority === 'buildings') {
      // M = I / (r * c) — higher clock = fewer machines.
      // Directly reward the reduction in total machines.
      if (roundedTotal > 0 && scaledTotalMachines > 0) {
        const reduction = 1 - scaledTotalMachines / roundedTotal;
        score += reduction * 500;
      }
    }

    // Target banks override
    if (targetBanks > 0 && banksNeeded > 0) {
      if (banksNeeded === targetBanks) {
        score += 500;
      } else if (
        targetBanks % banksNeeded === 0 ||
        banksNeeded % targetBanks === 0
      ) {
        score += 200;
      } else {
        const diff = Math.abs(banksNeeded - targetBanks);
        score -= diff * 20;
      }
    }

    // For logistics priority, strongly prefer the current overclock.
    // The formula assumes overclock as a given and optimizes bank size around it.
    if (oc === currentOverclock) {
      score += priority === 'logistics' ? 500 : 50;
    }

    // Tiebreaker: prefer clean overclock percentages
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
  const basePower = computeTotalPower(building, roundedTotal, currentOverclock);

  const ctx: SearchContext = {
    baseLines,
    building,
    roundedTotal,
    currentOverclock,
    basePower,
    priority,
    maxBankSize,
    targetBanks,
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

    const ocBucket = Math.round(opt.overclock * 100);
    const ocCount = seenOverclocks.get(ocBucket) ?? 0;
    if (ocCount >= 3) continue;

    if (seenBankSizes.has(opt.machineCount)) continue;

    seenOverclocks.set(ocBucket, ocCount + 1);
    seenBankSizes.add(opt.machineCount);
    result.push(opt);
  }

  return result;
}
