import { useStore } from '@/core/zustand';
import { ActionIcon, Tooltip } from '@mantine/core';
import {
  IconArrowsDiagonal,
  IconArrowsDiagonalMinimize2,
  IconChevronDown,
  IconChevronUp,
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
          <IconChevronDown stroke={2} size={16} />
        ) : (
          <IconChevronUp stroke={2} size={16} />
        )}
      </ActionIcon>
    </Tooltip>
  );
}
