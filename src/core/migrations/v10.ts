import { initialMapSliceState, type MapSlice } from '@/map/store/mapSlice';

/**
 * v10 introduces master + per-category + per-spline-kind visibility
 * flags on the map slice for the built-infrastructure canvas layer.
 * Backfills the new flags with their defaults (master on, every
 * category and spline kind visible) and leaves the rest of the slice
 * untouched.
 */
export function storeMigrationV10(state: unknown): unknown {
  const defaults = initialMapSliceState();
  const root = state as { map?: Partial<MapSlice> };
  return {
    ...(state as object),
    map: {
      ...defaults,
      ...(root.map ?? {}),
      infrastructureMaster:
        typeof root.map?.infrastructureMaster === 'boolean'
          ? root.map.infrastructureMaster
          : defaults.infrastructureMaster,
      infrastructureCategoryVisibility:
        root.map?.infrastructureCategoryVisibility ??
        defaults.infrastructureCategoryVisibility,
      infrastructureSplineVisibility:
        root.map?.infrastructureSplineVisibility ??
        defaults.infrastructureSplineVisibility,
    },
  };
}
