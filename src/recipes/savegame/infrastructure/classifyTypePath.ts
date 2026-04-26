import type { Classification } from './types';

const RE_BELT = /Build_ConveyorBelt(?:Mk(\d+))?_C$/;
const RE_HYPER = /Build_PipelineHyper.*_C$/;
const RE_PIPE = /Build_Pipeline(?:MK(\d+))?(?:_NoIndicator)?_C$/;
const RE_RAIL = /Build_RailroadTrack(?:Integrated)?_C$/;
const RE_POWER_LINE = /Build_PowerLine.*_C$/;

/**
 * Decides how the worker should treat an entity given its `typePath`.
 * The order of checks matters: hyper tubes have to be checked before
 * the generic pipe regex (`Build_PipelineHyper*` would otherwise
 * match `Build_Pipeline*`), and rails before "anything else", because
 * the network branches each have their own data layout downstream.
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
  if (RE_POWER_LINE.test(typePath)) {
    return { mode: 'powerline' };
  }
  return { mode: 'building' };
}
