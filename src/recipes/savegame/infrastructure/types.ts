import type { SplineKind } from '../ParseSavegameMessages';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec4 extends Vec3 {
  w: number;
}

/**
 * Result of {@link import('./classifyTypePath').classifyTypePath}.
 * Drives the per-entity branch in the worker (extract spline points,
 * extract power-line wires, or treat as a footprinted building).
 */
export type Classification =
  | {
      mode: 'spline';
      kind: SplineKind;
      tier: number;
      /** Property name on the entity carrying the SplinePointData array.
       * Defaults to `mSplineData` for belts / pipes / rails / hypertubes;
       * vehicle paths store the same struct shape under `mSplinePoints`. */
      splineProperty?: string;
    }
  | { mode: 'powerline' }
  | { mode: 'building' };

/**
 * Loose shape of a `SaveEntity` from `@etothepii/satisfactory-file-parser`.
 * Kept narrow on purpose: the parser exposes a deeply nested tagged
 * union that's painful to thread through; we only read a handful of
 * fields and prefer crisp local typing over importing the whole world.
 */
export interface SaveEntityLike {
  type?: string;
  typePath?: unknown;
  transform?: {
    translation?: Partial<Vec3>;
    rotation?: Partial<Vec4>;
  };
  properties?: Record<string, unknown>;
  specialProperties?: { type?: unknown } & Record<string, unknown>;
}

/** Shape of a single instance inside the lightweight buildable subsystem. */
export interface BuildableInstanceLike {
  transform?: {
    translation?: Partial<Vec3>;
    rotation?: Partial<Vec4>;
  };
}

/**
 * Shape of `BuildableSubsystemSpecialProperties` as exposed by the
 * parser. Used to walk the aggregated foundation/wall/decor list that
 * Satisfactory 1.0+ stores under `FGLightweightBuildableSubsystem`
 * instead of as standalone SaveEntities.
 */
export interface BuildableSubsystemLike {
  type?: string;
  buildables?: Array<{
    typeReference?: { pathName?: unknown };
    instances?: BuildableInstanceLike[];
  }>;
}

export const LIGHTWEIGHT_SUBSYSTEM_TYPEPATH =
  '/Script/FactoryGame.FGLightweightBuildableSubsystem';
