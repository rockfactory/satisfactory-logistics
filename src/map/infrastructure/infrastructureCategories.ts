import {
  AllFactoryBuildingsMap,
  type FactoryBuilding,
} from '@/recipes/FactoryBuilding';
import type {
  InfrastructureCategory,
  SplineKind,
} from '@/recipes/savegame/ParseSavegameMessages';

/**
 * Last segment of the typePath after the final `.`. For
 * `/Game/.../Build_AssemblerMk1.Build_AssemblerMk1_C` returns
 * `Build_AssemblerMk1_C`. Returns `null` if the input is empty.
 */
export function buildingIdFromTypePath(typePath: string): string | null {
  const last = typePath.split('.').pop();
  return last && last.length > 0 ? last : null;
}

function categoryFromKnownBuilding(
  building: FactoryBuilding,
): InfrastructureCategory {
  if (building.powerGenerator) return 'power';
  if (building.conveyor || building.pipeline) return 'logistics';
  // Extractors (miners, oil pumps, fracking) are production for our
  // purposes: they are the head of a production chain, not a logistics
  // connector, and the user thinks of them as factory machines.
  return 'production';
}

const FOUNDATION_BUILDING_PREFIXES = [
  '/Buildable/Building/Foundation',
  '/Buildable/Building/Wall',
  '/Buildable/Building/Stair',
  '/Buildable/Building/Beam',
  '/Buildable/Building/Ramp',
  '/Buildable/Building/Roof',
  '/Buildable/Building/Floor',
  '/Buildable/Building/Catwalk',
  '/Buildable/Building/Pillar',
  '/Buildable/Building/Window',
  '/Buildable/Building/Door',
  '/Buildable/Building/Fence',
];

/**
 * Maps an entity's `typePath` to a category for rendering. Path-based
 * checks come *before* the `AllFactoryBuildingsMap` lookup because the
 * map's per-building category derivation defaults to `production` for
 * anything without an extractor / conveyor / pipeline / generator
 * marker — and that misclassifies foundations, walls, train stations,
 * etc. that *do* have entries (and recipes) in the static catalog.
 * The catalog still serves as a precise fallback for the things that
 * aren't matched by any path prefix.
 */
export function categoryFor(typePath: string): InfrastructureCategory {
  if (typePath.includes('/Buildable/Vehicle/')) return 'transport';
  if (typePath.includes('/Buildable/Factory/Train/')) return 'transport';

  if (typePath.includes('/Buildable/Factory/PowerLine')) return 'power';
  if (typePath.includes('/Buildable/Factory/PowerPole')) return 'power';
  if (typePath.includes('/Buildable/Factory/PowerTower')) return 'power';
  if (typePath.includes('/Buildable/Factory/PowerStorage')) return 'power';
  if (typePath.includes('/Buildable/Factory/Generator')) return 'power';

  if (typePath.includes('/Buildable/Factory/Storage')) return 'storage';

  if (typePath.includes('/Buildable/Factory/Pipeline')) return 'logistics';
  if (typePath.includes('/Buildable/Factory/PipeJunction')) return 'logistics';
  if (typePath.includes('/Buildable/Factory/Conveyor')) return 'logistics';
  if (typePath.includes('/Buildable/Factory/CA_')) return 'logistics';

  if (typePath.includes('/Buildable/Factory/Sign')) return 'decor';
  if (typePath.includes('/Buildable/Factory/Light')) return 'decor';
  if (typePath.includes('/Buildable/Factory/Potty')) return 'decor';
  if (typePath.includes('/Buildable/Factory/Jumppad')) return 'decor';

  for (const prefix of FOUNDATION_BUILDING_PREFIXES) {
    if (typePath.includes(prefix)) return 'foundation';
  }
  if (typePath.includes('/Buildable/Building/')) return 'foundation';

  // Catalog lookup: precise classification for the remaining factory
  // machines (assemblers, miners, refineries, ...).
  const id = buildingIdFromTypePath(typePath);
  if (id) {
    const known = AllFactoryBuildingsMap[id];
    if (known) return categoryFromKnownBuilding(known);
  }

  if (typePath.includes('/Buildable/Factory/')) return 'production';

  return 'other';
}

export const CategoryColor: Record<InfrastructureCategory, string> = {
  production: '#3b82f6',
  logistics: '#f59e0b',
  power: '#a855f7',
  storage: '#10b981',
  transport: '#06b6d4',
  foundation: '#6b7280',
  decor: '#9ca3af',
  other: '#78716c',
};

export const CategoryLabel: Record<InfrastructureCategory, string> = {
  production: 'Production',
  logistics: 'Logistics',
  power: 'Power',
  storage: 'Storage',
  transport: 'Transport',
  foundation: 'Foundation',
  decor: 'Decoration',
  other: 'Other',
};

/**
 * Per-tier stroke color for the spline networks. `tier === 0` is the
 * fallback for kinds without tiering (rail, power).
 */
export const SplineColor: Record<SplineKind, Record<number, string>> = {
  belt: {
    0: '#9ca3af',
    1: '#9ca3af',
    2: '#fbbf24',
    3: '#f97316',
    4: '#dc2626',
    5: '#a21caf',
    6: '#7c3aed',
  },
  pipe: {
    0: '#3b82f6',
    1: '#3b82f6',
    2: '#0ea5e9',
  },
  hyper: {
    0: '#a855f7',
  },
  rail: {
    0: '#78350f',
  },
  power: {
    0: '#fde68a',
  },
  vehicle: {
    0: '#06b6d4',
  },
};

export const SplineLabel: Record<SplineKind, string> = {
  belt: 'Conveyor belts',
  pipe: 'Pipes',
  hyper: 'Hyper tubes',
  rail: 'Railroads',
  power: 'Power lines',
  vehicle: 'Vehicle paths',
};

export function splineColor(kind: SplineKind, tier: number): string {
  const palette = SplineColor[kind];
  return palette[tier] ?? palette[0];
}
