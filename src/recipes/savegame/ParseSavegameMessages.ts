export type IParseSavegameRequest = {
  type: 'parse';
  file: File;
  extractInfrastructure?: boolean;
};

export type InfrastructureCategory =
  | 'production'
  | 'logistics'
  | 'power'
  | 'storage'
  | 'transport'
  | 'foundation'
  | 'decor'
  | 'other';

export const INFRASTRUCTURE_CATEGORIES: InfrastructureCategory[] = [
  'production',
  'logistics',
  'power',
  'storage',
  'transport',
  'foundation',
  'decor',
  'other',
];

export type SplineKind = 'belt' | 'pipe' | 'hyper' | 'rail' | 'power';

export const SPLINE_KINDS: SplineKind[] = [
  'belt',
  'pipe',
  'hyper',
  'rail',
  'power',
];

/**
 * Parallel arrays representing all standalone buildings (anything with a
 * footprint that is not a spline-shaped connector). Indexed 0..count-1.
 */
export interface InfrastructureBuildingsBlock {
  count: number;
  /** Index into INFRASTRUCTURE_CATEGORIES. */
  categories: Uint8Array;
  /** count*2, world cm. */
  positionsXY: Float32Array;
  /**
   * count, world cm. Z translation (the building's base elevation).
   * Used together with {@link heights} to pick the topmost building
   * under the cursor — a constructor stacked on a foundation should
   * win the hit over the foundation it sits on.
   */
  positionsZ: Float32Array;
  /** count, radians (yaw around vertical axis, world frame). */
  yaw: Float32Array;
  /** count*2, width and length in cm (footprint). */
  sizeWL: Float32Array;
  /** count, height of the building in cm (clearance.height). */
  heights: Float32Array;
  /**
   * Per-building typePath (e.g. `Build_AssemblerMk1_C`), used for the
   * hover popover's display name. Stored as a parallel string array
   * rather than a transferable view because each unique typePath is a
   * shared interned string in the worker, so the structured-clone copy
   * is cheap (one pointer per building).
   */
  typePaths: string[];
}

/**
 * One block per (kind, tier) pair. `offsets` is a CSR-style index:
 * polyline `i` occupies pointsXY[offsets[i]*2 .. offsets[i+1]*2].
 */
export interface InfrastructureSplinesBlock {
  kind: SplineKind;
  /** 0 when the kind has no tiering (rail, power). */
  tier: number;
  count: number;
  /** count+1, point indices (NOT byte offsets). */
  offsets: Uint32Array;
  /** Total points across all polylines, *2, world cm. */
  pointsXY: Float32Array;
}

export interface ParsedInfrastructure {
  buildings: InfrastructureBuildingsBlock;
  splines: InfrastructureSplinesBlock[];
  counts: Record<InfrastructureCategory, number>;
  splineCounts: Record<SplineKind, number>;
}

export interface ParsedSatisfactorySave {
  /**
   * Includes all recipes that are available in the savegame, even buildings.
   */
  availableRecipes: string[];
  /**
   * Resource node ids (matching `WorldResourceNodes.json`'s `id` field)
   * that have a miner / oil pump / fracking extractor placed on them in
   * the save. Intended to be written straight into
   * `games[gameId].usedNodes` so imported saves light up the map's
   * used-node state. Water pumps are intentionally excluded: they sit
   * in `FGWaterVolume_*` actors rather than on `BP_ResourceNode_*` so
   * their `mExtractableResource` pathName does not map to a node in
   * our static dataset.
   */
  usedNodeIds: string[];
  /**
   * User-built infrastructure (buildings + spline networks) packed into
   * typed arrays. Only present when the request had
   * `extractInfrastructure: true`. Held in memory for the session only,
   * never persisted.
   */
  infrastructure?: ParsedInfrastructure;
}

export type IParseSavegameResponse =
  | {
      type: 'parsed';
      save: ParsedSatisfactorySave;
    }
  | {
      type: 'progress';
      progress: number;
      message?: string;
    }
  | {
      type: 'error';
      message: string;
    };

/**
 * Returns every transferable ArrayBuffer inside a `ParsedInfrastructure`,
 * to be passed as the second argument of `worker.postMessage` (and the
 * `transfer` option of `structuredClone`-style APIs) for zero-copy
 * delivery to the main thread.
 */
export function collectInfrastructureTransferables(
  infra: ParsedInfrastructure,
): ArrayBuffer[] {
  const buffers: ArrayBuffer[] = [
    infra.buildings.categories.buffer as ArrayBuffer,
    infra.buildings.positionsXY.buffer as ArrayBuffer,
    infra.buildings.positionsZ.buffer as ArrayBuffer,
    infra.buildings.yaw.buffer as ArrayBuffer,
    infra.buildings.sizeWL.buffer as ArrayBuffer,
    infra.buildings.heights.buffer as ArrayBuffer,
  ];
  for (const spline of infra.splines) {
    buffers.push(spline.offsets.buffer as ArrayBuffer);
    buffers.push(spline.pointsXY.buffer as ArrayBuffer);
  }
  return buffers;
}
