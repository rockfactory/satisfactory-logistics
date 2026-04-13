import { alpha, Box, Group, Image, Text, Tooltip } from '@mantine/core';
import {
  BaseEdge,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
  useInternalNode,
  useStore,
} from '@xyflow/react';
import { last } from 'lodash';
import type { FC } from 'react';
import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import {
  useGameSettingMaxBelt,
  useGameSettingMaxPipeline,
} from '@/games/gamesSlice';
import {
  FactoryConveyorBelts,
  FactoryPipelinesExclAlternates,
} from '@/recipes/FactoryBuilding';
import { type FactoryItem, FactoryItemForm } from '@/recipes/FactoryItem';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
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
  // Destructure to prevent forwarding to DOM
  selectable: _selectable,
  deletable: _deletable,
  sourceHandleId: _sourceHandleId,
  targetHandleId: _targetHandleId,
  pathOptions: _pathOptions,
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

  const maxBelt = useGameSettingMaxBelt();
  const maxPipeline = useGameSettingMaxPipeline();
  const isOverMaxBelt = maxBelt && (data?.value ?? 0) > maxBelt.conveyor!.speed;
  const isOverMaxPipeline =
    maxPipeline && (data?.value ?? 0) > maxPipeline.pipeline!.flowRate;

  const isOverMaxLogistic =
    data?.resource?.form === FactoryItemForm.Gas ||
    data?.resource?.form === FactoryItemForm.Liquid
      ? isOverMaxPipeline
      : isOverMaxBelt;

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

  // If we don't have a max belt, use the last one (Mk6)
  const usedBelt = maxBelt ?? last(FactoryConveyorBelts)!;
  // If we don't have a max pipeline, use the last one (Mk2)
  const usedPipeline = maxPipeline ?? last(FactoryPipelinesExclAlternates)!;

  const neededBelts =
    Math.ceil((data?.value ?? 0) / usedBelt.conveyor!.speed) ?? null;
  const neededPipelines =
    Math.ceil((data?.value ?? 0) / usedPipeline.pipeline!.flowRate) ?? null;

  const isLiquidOrGas =
    data?.resource?.form === FactoryItemForm.Gas ||
    data?.resource?.form === FactoryItemForm.Liquid;
  const usedLogistic = isLiquidOrGas ? usedPipeline : usedBelt;
  const usedLogisticMax = isLiquidOrGas ? neededPipelines : neededBelts;

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
            pointerEvents: 'all',
            borderRadius: 4,
            backgroundColor: alpha(
              isOverMaxLogistic ? '#75341e' : 'var(--mantine-color-dark-6)',
              0.8,
            ),
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          className="nodrag"
        >
          <Tooltip
            color="dark.8"
            label={
              <Group>
                <Image
                  src={usedLogistic.imagePath}
                  alt={usedLogistic.name}
                  w={24}
                  h={24}
                />
                <Text>
                  {usedLogisticMax}x {usedLogistic.name}
                </Text>
              </Group>
            }
          >
            <Group gap="4px">
              <FactoryItemImage size={16} id={data?.resource.id} />
              <Text size="10px">
                <RepeatingNumber value={data?.value} />
                /min
              </Text>
            </Group>
          </Tooltip>
        </Box>
      </EdgeLabelRenderer>
    </>
  );
};
