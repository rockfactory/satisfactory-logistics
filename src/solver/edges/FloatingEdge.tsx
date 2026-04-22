import { type EdgeProps, useInternalNode } from '@xyflow/react';

import { useGameSetting } from '@/games/gamesSlice';
import { useSolverHighlightOptional } from '@/solver/layout/highlight/SolverHighlightContext';
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
  const highlight = useSolverHighlightOptional();

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

  const highlightedNodeId = highlight?.highlightedNodeId ?? null;
  const isHighlighted =
    highlightedNodeId != null &&
    (highlightedNodeId === source || highlightedNodeId === target);
  const isDimmed = highlightedNodeId != null && !isHighlighted;

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      strokeWidth={isHighlighted ? 7 : 5}
      markerEnd={markerEnd}
      style={{
        ...style,
        opacity: isDimmed ? 0.15 : 1,
        transition: 'opacity 0.2s, stroke-width 0.2s',
      }}
    />
  );
}
