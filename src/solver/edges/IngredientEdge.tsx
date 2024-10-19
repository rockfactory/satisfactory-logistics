import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { alpha, Box, Group, Text } from '@mantine/core';
import {
  BaseEdge,
  Edge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  useInternalNode,
  useStore,
} from '@xyflow/react';
import { FC } from 'react';
import { RepeatingNumber } from '../../core/intl/NumberFormatter';
import { FactoryItem } from '../../recipes/FactoryItem';
import { getEdgeParams, getSpecialPath } from './utils';

export interface IIngredientEdgeData {
  resource: FactoryItem;
  value: number;
  [key: string]: unknown;
}

const INVERSE_GAP = 10;

export const IngredientEdge: FC<EdgeProps<Edge<IIngredientEdgeData>>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  source,
  target,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  ...edgeProps
}) => {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  const isBiDirectionEdge = useStore(s => {
    const edgeExists = s.edges.some(
      e =>
        (e.source === target && e.target === source) ||
        (e.target === source && e.source === target),
    );
    return edgeExists;
  });

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    sourceNode,
    targetNode,
  );
  const edgePathParams = {
    sourceX: sx === tx ? sx + 0.0001 : sx,
    sourceY: sy === ty ? sy + 0.0001 : sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
  };

  const [edgePath, labelX, labelY] = isBiDirectionEdge
    ? getSpecialPath(edgePathParams)
    : getBezierPath(edgePathParams);

  const duration = 60 / (data?.value ?? 0);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        {...edgeProps}
        style={{
          stroke:
            sx < tx ? 'url(#edge-gradient)' : 'url(#edge-gradient-reverse)',
        }}
      />
      <circle r="2" fill="var(--mantine-color-indigo-3)">
        <animateMotion
          dur={`${duration}s`}
          repeatCount="indefinite"
          path={edgePath}
        />
      </circle>
      <EdgeLabelRenderer>
        <Box
          p={'4px'}
          style={{
            borderRadius: 4,
            backgroundColor: alpha('var(--mantine-color-dark-6)', 0.8),
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          className="nodrag nopan"
        >
          <Group gap="4px">
            <FactoryItemImage size={16} id={data?.resource.id} />
            <Text size="10px">
              <RepeatingNumber value={data?.value} />
              /min
            </Text>
          </Group>
        </Box>
      </EdgeLabelRenderer>
    </>
  );
};
