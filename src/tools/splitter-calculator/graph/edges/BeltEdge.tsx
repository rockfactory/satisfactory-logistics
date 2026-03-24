import { alpha, Box, Text } from '@mantine/core';
import {
  BaseEdge,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
  useInternalNode,
} from '@xyflow/react';
import type { FC } from 'react';
import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import { getEdgeParams } from '@/solver/edges/utils';

export interface IBeltEdgeData {
  carrying: number;
  beltName?: string;
  beltSpeed?: number;
  [key: string]: unknown;
}

/**
 * Belt tier color palette — each Mk level gets a distinct color so the
 * diagram is readable at a glance without text labels.
 */
const BELT_COLORS: Record<number, string> = {
  60: '#868e96',   // Mk.1 — gray
  120: '#51cf66',  // Mk.2 — green
  270: '#339af0',  // Mk.3 — blue
  480: '#cc5de8',  // Mk.4 — purple
  780: '#ff922b',  // Mk.5 — orange
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
  data,
  ...edgeProps
}) => {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) return null;

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    sourceNode,
    targetNode,
  );

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx === tx ? sx + 0.0001 : sx,
    sourceY: sy === ty ? sy + 0.0001 : sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
  });

  const carrying = data?.carrying ?? 0;
  const duration = carrying > 0 ? 60 / carrying : 10;
  const beltColor = getBeltColor(data?.beltSpeed);
  const dotColor = getBeltDotColor(data?.beltSpeed);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        {...edgeProps}
        style={{
          stroke: beltColor,
          strokeWidth: 2,
          opacity: 0.85,
        }}
      />
      <circle r="2.5" fill={dotColor}>
        <animateMotion
          dur={`${duration}s`}
          repeatCount="indefinite"
          path={edgePath}
        />
      </circle>
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
