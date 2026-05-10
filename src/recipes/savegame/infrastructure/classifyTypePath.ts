import type { Classification } from './types';

const RE_BELT = /Build_ConveyorBelt(?:Mk(\d+))?_C$/;
const RE_HYPER = /Build_PipeHyper(?:Mk\d+)?_C$/;
const RE_PIPE = /Build_Pipeline(?:MK(\d+))?(?:_NoIndicator)?_C$/;
const RE_RAIL = /Build_RailroadTrack(?:Integrated)?_C$/;
const RE_POWER_LINE = /Build_PowerLine.*_C$/;
const RE_VEHICLE_PATH = /Build_VehiclePath_Universal(?:_.*)?_C$/;

/**
 * Decides how the worker should treat an entity given its `typePath`.
 * Each branch downstream has its own data layout — belts, pipes,
 * hypertubes, rails, vehicle paths, and power lines all carry their
 * spline / wire data in slightly different shapes.
 */
export function classifyTypePath(typePath: string): Classification {
  const belt = typePath.match(RE_BELT);
  if (belt) {
    const tier = belt[1] ? Number.parseInt(belt[1], 10) : 1;
    return { mode: 'spline', kind: 'belt', tier };
  }
  if (RE_HYPER.test(typePath)) {
    return { mode: 'spline', kind: 'hyper', tier: 0 };
  }
  const pipe = typePath.match(RE_PIPE);
  if (pipe) {
    const tier = pipe[1] ? Number.parseInt(pipe[1], 10) : 1;
    return { mode: 'spline', kind: 'pipe', tier };
  }
  if (RE_RAIL.test(typePath)) {
    return { mode: 'spline', kind: 'rail', tier: 0 };
  }
  if (RE_VEHICLE_PATH.test(typePath)) {
    return {
      mode: 'spline',
      kind: 'vehicle',
      tier: 0,
      splineProperty: 'mSplinePoints',
    };
  }
  if (RE_POWER_LINE.test(typePath)) {
    return { mode: 'powerline' };
  }
  return { mode: 'building' };
}
