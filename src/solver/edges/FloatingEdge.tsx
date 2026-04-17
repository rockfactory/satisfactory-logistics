import { type EdgeProps, useInternalNode } from '@xyflow/react';

import { useGameSetting } from '@/games/gamesSlice';
import { getConfigurableEdgePath } from './getConfigurableEdgePath';
import { getEdgeParams } from './utils.js';

export function FloatingEdge({
  id,
  source,
  target,
  markerEnd,
  style,
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const orthogonalEdges = useGameSetting('orthogonalEdges') as
    | boolean
    | undefined;

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    sourceNode,
    targetNode,
  );

  const [edgePath] = getConfigurableEdgePath(
    {
      sourceX: sx,
      sourceY: sy,
      sourcePosition: sourcePos,
      targetPosition: targetPos,
      targetX: tx,
      targetY: ty,
    },
    !!orthogonalEdges,
  );

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      strokeWidth={5}
      markerEnd={markerEnd}
      style={style}
    />
  );
}
