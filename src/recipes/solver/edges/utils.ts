import { InternalNode, Position } from '@xyflow/react';

// returns the position (top,right,bottom or right) passed node compared to
function getParams(nodeA: InternalNode, nodeB: InternalNode) {
  const centerA = getNodeCenter(nodeA);
  const centerB = getNodeCenter(nodeB);

  const horizontalDiff = Math.abs(centerA.x - centerB.x);
  const verticalDiff = Math.abs(centerA.y - centerB.y);

  let position;

  // when the horizontal difference between the nodes is bigger, we use Position.Left or Position.Right for the handle
  if (horizontalDiff > verticalDiff) {
    position = centerA.x > centerB.x ? Position.Left : Position.Right;
  } else {
    // here the vertical difference between the nodes is bigger, so we use Position.Top or Position.Bottom for the handle
    position = centerA.y > centerB.y ? Position.Top : Position.Bottom;
  }

  const [x, y] = getHandleCoordsByPosition(nodeA, position);
  return [x, y, position] as const;
}

function getHandleCoordsByPosition(
  node: InternalNode,
  handlePosition: Position,
) {
  // all handles are from type source, that's why we use handleBounds.source here
  const handle = node.internals.handleBounds?.source?.find(
    h => h.position === handlePosition,
  );

  if (!handle) {
    return [0, 0];
  }

  let offsetX = handle!.width / 2;
  let offsetY = handle!.height / 2;

  // this is a tiny detail to make the markerEnd of an edge visible.
  // The handle position that gets calculated has the origin top-left, so depending which side we are using, we add a little offset
  // when the handlePosition is Position.Right for example, we need to add an offset as big as the handle itself in order to get the correct position
  // switch (handlePosition) {
  //   case Position.Left:
  //     offsetX = 0;
  //     break;
  //   case Position.Right:
  //     offsetX = handle!.width;
  //     break;
  //   case Position.Top:
  //     offsetY = 0;
  //     break;
  //   case Position.Bottom:
  //     offsetY = handle!.height;
  //     break;
  // }

  const x = node.internals.positionAbsolute.x + handle!.x + offsetX;
  const y = node.internals.positionAbsolute.y + handle!.y + offsetY;

  return [x, y];
}

function getNodeCenter(node: InternalNode) {
  return {
    x: node.internals.positionAbsolute.x + node.measured.width! / 2,
    y: node.internals.positionAbsolute.y + node.measured.height! / 2,
  };
}

// returns the parameters (sx, sy, tx, ty, sourcePos, targetPos) you need to create an edge
export function getEdgeParams(source: InternalNode, target: InternalNode) {
  const [sx, sy, sourcePos] = getParams(source, target);
  const [tx, ty, targetPos] = getParams(target, source);

  return {
    sx,
    sy,
    tx,
    ty,
    sourcePos,
    targetPos,
  };
}

export type GetSpecialPathParams = {
  sourceX: number;
  sourceY: number;
  sourcePosition: Position;
  targetX: number;
  targetY: number;
  targetPosition: Position;
};

const SPECIAL_PATH_OFFSET = 35;

export const getSpecialPath = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: GetSpecialPathParams) => {
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2;

  const isHorizontal =
    sourcePosition === Position.Left || sourcePosition === Position.Right;
  const offsetX = !isHorizontal
    ? sourceX < targetX
      ? SPECIAL_PATH_OFFSET
      : -SPECIAL_PATH_OFFSET
    : 0;
  const offsetY = isHorizontal
    ? sourceY < targetY ||
      (Math.abs(sourceY - targetY) < 0.0001 && sourceX < targetX)
      ? SPECIAL_PATH_OFFSET
      : -SPECIAL_PATH_OFFSET
    : 0;

  const [disalignX, disalignY] = disalignSpecialHandlePos(
    targetPosition,
    offsetX,
    offsetY,
  );

  const path = `M ${sourceX} ${sourceY} Q ${centerX + offsetX} ${
    centerY + offsetY
  } ${targetX + disalignX} ${targetY + disalignY}`;

  const labelX = centerX + offsetX;
  const labelY = centerY + offsetY / 2;

  return [path, labelX, labelY] as const;
};

const DISALIGN_WEIGHT = 5;

const disalignSpecialHandlePos = (
  pos: Position,
  offsetX: number,
  offsetY: number,
) => {
  const xSign = offsetX > 0 ? 1 : -1;
  const ySign = offsetY > 0 ? 1 : -1;
  switch (pos) {
    case Position.Left:
      return [0, ySign * DISALIGN_WEIGHT];
    case Position.Right:
      return [0, ySign * DISALIGN_WEIGHT];
    case Position.Top:
      return [xSign * DISALIGN_WEIGHT, 0];
    case Position.Bottom:
      return [xSign * DISALIGN_WEIGHT, 0];
  }
};
