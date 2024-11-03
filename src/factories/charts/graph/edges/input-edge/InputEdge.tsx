import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import { useChartSetting } from '@/factories/charts/store/chartsSlice';
import type { FactoryInput } from '@/factories/Factory';
import { AllLogisticTypesMap } from '@/recipes/logistics/LogisticTypes';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { getEdgeParams, getSpecialPath } from '@/solver/edges/utils';
import { alpha, Box, Group, Image, Text } from '@mantine/core';
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

export interface IInputEdgeData {
  input: FactoryInput;
  // 0-1 stroke width
  scaledValue: number;
  [key: string]: unknown;
}

export const InputEdge: FC<EdgeProps<Edge<IInputEdgeData>>> = ({
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

  const widthMatchesInputAmount = useChartSetting('widthMatchesInputAmount');

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

  const transport = data?.input.transport
    ? AllLogisticTypesMap[data.input.transport]
    : null;

  const [edgePath, labelX, labelY] = isBiDirectionEdge
    ? getSpecialPath(edgePathParams)
    : getBezierPath(edgePathParams);

  const duration = 60 / (data?.input.amount ?? 1);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        {...edgeProps}
        style={{
          strokeWidth: widthMatchesInputAmount
            ? Math.min(data?.scaledValue ?? 0, 0.1) * 100
            : 1,
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
            pointerEvents: 'all',
            borderRadius: 4,
            backgroundColor: alpha('var(--mantine-color-dark-6)', 0.8),
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          className="nodrag"
        >
          <Group gap="4px">
            <FactoryItemImage size={16} highRes id={data?.input.resource} />
            <Text size="10px">
              <RepeatingNumber value={data?.input.amount ?? 0} />
              /min
            </Text>
            {transport && (
              <Image ml={6} src={transport.imagePath} w="16" h="16" />
            )}
          </Group>
        </Box>
      </EdgeLabelRenderer>
    </>
  );
};
