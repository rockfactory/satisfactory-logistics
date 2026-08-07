import { ActionIcon, Tooltip } from '@mantine/core';
import {
  IconArrowsDiagonal,
  IconArrowsDiagonalMinimize2,
} from '@tabler/icons-react';
import { useStore } from '@/core/zustand';

export interface IFactoryExpandActionIconProps {
  isCollapsed: boolean;
  factoryId: string;
  hasMissingInputs?: boolean;
}

export function FactoryExpandActionIcon(props: IFactoryExpandActionIconProps) {
  const { isCollapsed, factoryId, hasMissingInputs } = props;
  return (
    <Tooltip label={isCollapsed ? 'Expand' : 'Collapse'}>
      <ActionIcon
        variant="subtle"
        color="gray"
        onClick={() => useStore.getState().toggleGameFactoryExpanded(factoryId)}
        style={
          hasMissingInputs
            ? { border: '1px solid var(--mantine-color-error)' }
            : undefined
        }
      >
        {isCollapsed ? (
          <IconArrowsDiagonal
            stroke={2}
            size={16}
            color={hasMissingInputs ? 'var(--mantine-color-error)' : undefined}
          />
        ) : (
          <IconArrowsDiagonalMinimize2
            stroke={2}
            size={16}
            color={hasMissingInputs ? 'var(--mantine-color-error)' : undefined}
          />
        )}
      </ActionIcon>
    </Tooltip>
  );
}
