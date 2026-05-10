import { buildingIdFromTypePath } from '@/map/infrastructure/infrastructureCategories';
import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';

export interface ClearanceCm {
  width: number;
  length: number;
  height: number;
}

const FALLBACK_CLEARANCE_CM = 800;
const FALLBACK_HEIGHT_CM = 200;

/** Clearance fields in `FactoryBuildings.json` are in metres (game UI
 * unit), but the savegame transforms are in centimetres (Unreal native
 * unit) — multiply to compare apples to apples. */
const CLEARANCE_M_TO_CM = 100;

/**
 * Hand-tuned clearances (in cm) for connector buildings whose entry in
 * `FactoryBuildings.json` is either absent or has a `null` clearance.
 * The default 8x8m fallback paints these as factory-sized blobs over
 * the conveyors/pipes they actually serve as 1x1m attach points.
 */
const HARDCODED_CLEARANCE_CM: Record<string, ClearanceCm> = {
  Build_ConveyorPole_C: { width: 100, length: 100, height: 200 },
  Build_ConveyorPoleStackable_C: { width: 100, length: 100, height: 400 },
  Build_ConveyorPoleWall_C: { width: 100, length: 100, height: 100 },
  Build_ConveyorCeilingAttachment_C: { width: 100, length: 100, height: 100 },
  // Conveyor lifts are 2x2m in-game but ship with `null` clearance in
  // the catalog, so without an override they fall back to the 8x8m
  // factory default. Height varies by tier (Mk1 ~4m, taller tiers
  // longer), but the visible footprint is identical: a 2x2m vertical
  // shaft. Pick 4m as a shared height since the map only uses it for
  // topmost-under-cursor stacking.
  Build_ConveyorLiftMk1_C: { width: 200, length: 200, height: 400 },
  Build_ConveyorLiftMk2_C: { width: 200, length: 200, height: 400 },
  Build_ConveyorLiftMk3_C: { width: 200, length: 200, height: 400 },
  Build_ConveyorLiftMk4_C: { width: 200, length: 200, height: 400 },
  Build_ConveyorLiftMk5_C: { width: 200, length: 200, height: 400 },
  Build_ConveyorLiftMk6_C: { width: 200, length: 200, height: 400 },
  Build_PipelineSupport_C: { width: 100, length: 100, height: 200 },
  Build_PipelineSupportWall_C: { width: 100, length: 100, height: 100 },
  Build_PipelineSupportWallHole_C: { width: 100, length: 100, height: 100 },
  Build_PipelineFlowIndicator_C: { width: 100, length: 100, height: 100 },
  // Vehicle path waypoints: invisible markers in-game that just anchor
  // the recorded route. The 8x8m fallback paints them as big squares
  // sitting on top of the path spline. Render them as 1x1m so they
  // read as discreet dots at path joints instead of competing with the
  // spline itself.
  Build_VehiclePathNode_Default_C: { width: 100, length: 100, height: 100 },
  Build_VehiclePathNode_DockingStation_C: {
    width: 400,
    length: 400,
    height: 200,
  },
};

const SMALL_CLEARANCE_PATTERNS = [/Pole/, /Support/, /FlowIndicator/];

/**
 * Resolves a building's footprint + height in centimetres, used both
 * for rendering the rotated rectangle on canvas and for picking the
 * topmost building under the cursor (`z + height`). Lookup order:
 *
 *   1. Hard-coded overrides for connector-style buildables that have
 *      `null` or missing entries in the catalog.
 *   2. `AllFactoryBuildingsMap` entry, with metres → cm conversion.
 *   3. A 1x1m "small connector" fallback for any id matching the
 *      pole/support/flow-indicator regex (their catalog entries
 *      consistently arrive with `null` clearance).
 *   4. The 8x8m factory default, for unknown buildings.
 */
export function getClearance(typePath: string): ClearanceCm {
  const id = buildingIdFromTypePath(typePath);
  if (id) {
    const override = HARDCODED_CLEARANCE_CM[id];
    if (override) return override;
    const b = AllFactoryBuildingsMap[id];
    if (b?.clearance) {
      const { width, length, height } = b.clearance;
      if (width > 0 && length > 0) {
        return {
          width: width * CLEARANCE_M_TO_CM,
          length: length * CLEARANCE_M_TO_CM,
          height:
            (typeof height === 'number' && height > 0
              ? height
              : FALLBACK_HEIGHT_CM / CLEARANCE_M_TO_CM) * CLEARANCE_M_TO_CM,
        };
      }
    }
    if (SMALL_CLEARANCE_PATTERNS.some(re => re.test(id))) {
      return { width: 100, length: 100, height: 200 };
    }
  }
  return {
    width: FALLBACK_CLEARANCE_CM,
    length: FALLBACK_CLEARANCE_CM,
    height: FALLBACK_HEIGHT_CM,
  };
}
