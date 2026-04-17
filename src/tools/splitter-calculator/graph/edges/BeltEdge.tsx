import { alpha, Box, Text } from '@mantine/core';
import {
  BaseEdge,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
  Position,
  useInternalNode,
} from '@xyflow/react';
import type { FC } from 'react';
import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import { useEdgeAnimationEnabled } from '@/solver/edges/useEdgeAnimationEnabled';

export interface IBeltEdgeData {
  carrying: number;
  beltName?: string;
  beltSpeed?: number;
  sourceEdgeIndex?: number;
  sourceEdgeCount?: number;
  targetEdgeIndex?: number;
  targetEdgeCount?: number;
  selectedNodeId?: string | null;
  [key: string]: unknown;
}

/**
 * Belt tier color palette — each Mk level gets a distinct color so the
 * diagram is readable at a glance without text labels.
 */
const BELT_COLORS: Record<number, string> = {
  60: '#868e96', // Mk.1 — gray
  120: '#51cf66', // Mk.2 — green
  270: '#339af0', // Mk.3 — blue
  480: '#cc5de8', // Mk.4 — purple
  780: '#ff922b', // Mk.5 — orange
  1200: '#ff6b6b', // Mk.6 — red
};

const BELT_DOT_COLORS: Record<number, string> = {
  60: '#adb5bd',
  120: '#69db7c',
  270: '#4dabf7',
  480: '#da77f2',
  780: '#ffa94d',
  1200: '#ff8787',
};

function getBeltColor(speed: number | undefined): string {
  if (!speed) return '#868e96';
  return BELT_COLORS[speed] ?? '#868e96';
}

function getBeltDotColor(speed: number | undefined): string {
  if (!speed) return '#adb5bd';
  return BELT_DOT_COLORS[speed] ?? '#adb5bd';
}

export const BeltEdge: FC<EdgeProps<Edge<IBeltEdgeData>>> = ({
  id,
  source,
  target,
  sourceHandleId,
  targetHandleId,
  data,
  ...edgeProps
}) => {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const animationEnabled = useEdgeAnimationEnabled();

  if (!sourceNode || !targetNode) return null;

  const sourceHandle = sourceNode.internals.handleBounds?.source?.find(
    h => h.id === sourceHandleId,
  );
  const targetHandle = targetNode.internals.handleBounds?.target?.find(
    h => h.id === targetHandleId,
  );

  const sx =
    sourceNode.internals.positionAbsolute.x +
    (sourceHandle
      ? sourceHandle.x + sourceHandle.width / 2
      : sourceNode.measured.width! / 2);
  const sy =
    sourceNode.internals.positionAbsolute.y +
    (sourceHandle
      ? sourceHandle.y + sourceHandle.height / 2
      : sourceNode.measured.height! / 2);
  const tx =
    targetNode.internals.positionAbsolute.x +
    (targetHandle
      ? targetHandle.x + targetHandle.width / 2
      : targetNode.measured.width! / 2);
  const ty =
    targetNode.internals.positionAbsolute.y +
    (targetHandle
      ? targetHandle.y + targetHandle.height / 2
      : targetNode.measured.height! / 2);

  const sourcePos = sourceHandle?.position ?? Position.Right;
  const targetPos = targetHandle?.position ?? Position.Left;

  const SPREAD = 12;
  const srcCount = data?.sourceEdgeCount ?? 1;
  const srcIdx = data?.sourceEdgeIndex ?? 0;
  const tgtCount = data?.targetEdgeCount ?? 1;
  const tgtIdx = data?.targetEdgeIndex ?? 0;

  const srcOffset = srcCount > 1 ? (srcIdx - (srcCount - 1) / 2) * SPREAD : 0;
  const tgtOffset = tgtCount > 1 ? (tgtIdx - (tgtCount - 1) / 2) * SPREAD : 0;

  const adjSy = sy + srcOffset;
  const adjTy = ty + tgtOffset;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: sx,
    sourceY: adjSy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: adjTy,
    targetPosition: targetPos,
    borderRadius: 8,
  });

  const carrying = data?.carrying ?? 0;
  const duration = carrying > 0 ? 60 / carrying : 10;
  const beltColor = getBeltColor(data?.beltSpeed);
  const dotColor = getBeltDotColor(data?.beltSpeed);

  const selId = data?.selectedNodeId;
  const isConnected = selId === source || selId === target;
  const dimmed = selId != null && !isConnected;
  const highlighted = selId != null && isConnected;

  const strokeWidth = highlighted ? 3 : 2;
  const edgeOpacity = dimmed ? 0.2 : 0.85;
  const labelOpacity = dimmed ? 0.3 : 1;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        {...edgeProps}
        style={{
          stroke: beltColor,
          strokeWidth,
          opacity: edgeOpacity,
          transition: 'opacity 0.2s, stroke-width 0.2s',
        }}
      />
      {animationEnabled && (
        <circle
          r={highlighted ? 3 : 2.5}
          fill={dotColor}
          opacity={dimmed ? 0.2 : 1}
        >
          <animateMotion
            dur={`${duration}s`}
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      )}
      <EdgeLabelRenderer>
        <Box
          p="1px 5px"
          style={{
            pointerEvents: 'all',
            borderRadius: 3,
            backgroundColor: alpha('var(--mantine-color-dark-7)', 0.9),
            border: `1px solid ${beltColor}`,
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            opacity: labelOpacity,
            transition: 'opacity 0.2s',
          }}
          className="nodrag"
        >
          <Text size="10px" c={beltColor} fw={500}>
            <RepeatingNumber value={carrying} />
            /min
          </Text>
        </Box>
      </EdgeLabelRenderer>
    </>
  );
};
