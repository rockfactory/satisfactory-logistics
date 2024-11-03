import { useStore } from '@/core/zustand';
import { ActionIcon, Tooltip } from '@mantine/core';
import {
  IconArrowsDiagonal,
  IconArrowsDiagonalMinimize2,
} from '@tabler/icons-react';
export interface IFactoryExpandActionIconProps {
  isCollapsed: boolean;
  factoryId: string;
}

export function FactoryExpandActionIcon(props: IFactoryExpandActionIconProps) {
  const { isCollapsed, factoryId } = props;
  return (
    <Tooltip label={isCollapsed ? 'Expand' : 'Collapse'} color="dark.8">
      <ActionIcon
        variant="subtle"
        color="gray"
        onClick={() => useStore.getState().toggleGameFactoryExpanded(factoryId)}
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
