import { useStore } from '@/core/zustand';
import { useGameFactoriesHasAnyCollapsed } from '@/games/gamesSlice';
import { Button } from '@mantine/core';
import { IconChevronsDown, IconChevronsUp } from '@tabler/icons-react';

export interface IGameFactoriesExpandActionIconProps {}

export function GameFactoriesExpandActionIcon(
  props: IGameFactoriesExpandActionIconProps,
) {
  const isCollapsed = useGameFactoriesHasAnyCollapsed();

  return (
    <Button
      size="xs"
      variant="subtle"
      color="dimmed"
      onClick={() => useStore.getState().toggleAllFactoriesExpanded()}
      leftSection={
        isCollapsed ? (
          <IconChevronsDown stroke={2} size={16} />
        ) : (
          <IconChevronsUp stroke={2} size={16} />
        )
      }
    >
      {isCollapsed ? 'Expand all' : 'Collapse all'}
    </Button>
  );
}
