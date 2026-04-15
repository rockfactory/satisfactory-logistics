import { getBezierPath, getSmoothStepPath } from '@xyflow/react';

export function getConfigurableEdgePath(
  params: Parameters<typeof getBezierPath>[0],
  orthogonal: boolean,
) {
  return orthogonal
    ? getSmoothStepPath({ ...params, borderRadius: 8 })
    : getBezierPath(params);
}
