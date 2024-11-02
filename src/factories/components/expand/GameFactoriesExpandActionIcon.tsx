import { useStore } from '@/core/zustand';
import { useGameFactoriesHasAnyCollapsed } from '@/games/gamesSlice';
import { ActionIcon, Tooltip } from '@mantine/core';
import {
  IconArrowsDiagonal,
  IconArrowsDiagonalMinimize2,
} from '@tabler/icons-react';
export interface IGameFactoriesExpandActionIconProps {}

export function GameFactoriesExpandActionIcon(
  props: IGameFactoriesExpandActionIconProps,
) {
  const isCollapsed = useGameFactoriesHasAnyCollapsed();

  return (
    <Tooltip label={isCollapsed ? 'Expand all' : 'Collapse all'} color="dark.8">
      <ActionIcon
        variant="subtle"
        color="gray"
        onClick={() => useStore.getState().toggleAllFactoriesExpanded()}
      >
        {isCollapsed ? (
          <IconArrowsDiagonal stroke={2} size={16} />
        ) : (
          <IconArrowsDiagonalMinimize2 stroke={2} size={16} />
        )}
      </ActionIcon>
    </Tooltip>
  );
}
