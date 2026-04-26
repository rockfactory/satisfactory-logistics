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
  /**
   * Per-building overclock multiplier (`mCurrentPotential` in the save:
   * 1.0 = 100%, 1.5 = 150% / overclocked, 0.5 = 50% / underclocked).
   * `NaN` for entities that don't expose the property (foundations,
   * decor, every instance inside the lightweight buildable subsystem).
   * The hover popover only renders the value when it's a finite
   * number that isn't ~1.0.
   */
  overclocks: Float32Array;
  /**
   * Per-building somersloop / production-shard count
   * (`mAddedSomersloops` in the save). 0 for entities without slots
   * filled. The popover renders this as `Somersloop ×N` when N > 0.
   */
  somersloops: Uint8Array;
  /**
   * Per-building recipe id selected in the production machine
   * (last segment of `mCurrentRecipeRef.pathName`, e.g.
   * `Recipe_IronPlate_C`). Empty string when the entity has no
   * recipe slot or hasn't been set.
   */
  recipes: string[];
  /**
   * Per-building resource node id this entity extracts from
   * (last segment of `mExtractableResource.value.pathName`, e.g.
   * `BP_ResourceDeposit1642`). Empty string for non-extractor
   * entities. Water pumps point at `FGWaterVolume_*` entries which
   * aren't in the static node dataset; the hover popover special-
   * cases the typePath to render "Water" for those instead of
   * trying to resolve the id.
   */
  extractedNodes: string[];
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
  /**
   * count*4 — per-polyline axis-aligned bounding box in world cm,
   * laid out as `[minX, minY, maxX, maxY]` per polyline. Computed
   * once during {@link import('./infrastructure/extractInfrastructure').finalizeInfrastructure}
   * so the canvas layer can viewport-cull polylines without
   * re-scanning their points every frame.
   */
  polylineBounds: Float32Array;
  /**
   * `null` when the source has no Hermite tangents (power-line wires);
   * otherwise `totalPoints*4` floats in world cm per point, laid out
   * `[arriveX, arriveY, leaveX, leaveY]`. Lets the canvas layer turn
   * each segment into a `bezierCurveTo` so curved track / belt
   * sections render as actual curves instead of straight chords
   * between control points.
   */
  tangentsXY: Float32Array | null;
}

export interface ParsedInfrastructure {
  buildings: InfrastructureBuildingsBlock;
  splines: InfrastructureSplinesBlock[];
  counts: Record<InfrastructureCategory, number>;
  splineCounts: Record<SplineKind, number>;
}

export interface ParsedPlayerPosition {
  x: number;
  y: number;
  z: number;
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
   * World-cm positions of every `Char_Player_C` actor in the save.
   * Empty array when no player has spawned yet (rare). Used to center
   * the map view on the host on import and to render a Player marker
   * on the canvas. In-memory only, never persisted.
   */
  players: ParsedPlayerPosition[];
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
    infra.buildings.overclocks.buffer as ArrayBuffer,
    infra.buildings.somersloops.buffer as ArrayBuffer,
  ];
  for (const spline of infra.splines) {
    buffers.push(spline.offsets.buffer as ArrayBuffer);
    buffers.push(spline.pointsXY.buffer as ArrayBuffer);
    buffers.push(spline.polylineBounds.buffer as ArrayBuffer);
    if (spline.tangentsXY) {
      buffers.push(spline.tangentsXY.buffer as ArrayBuffer);
    }
  }
  return buffers;
}
