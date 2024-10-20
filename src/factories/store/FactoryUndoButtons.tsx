import { ActionIcon, Group, Tooltip } from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import { IconArrowBackUp, IconArrowForwardUp } from '@tabler/icons-react';

export interface IFactoryUndoButtonsProps {}

/**
 * @deprecated
 */
export function FactoryUndoButtons(props: IFactoryUndoButtonsProps) {
  useHotkeys([
    [
      'mod+z',
      e => {
        e.preventDefault();
        // dispatch(ActionCreators.undo());
      },
    ],
    [
      'shift+mod+z',
      e => {
        e.preventDefault();
        // dispatch(ActionCreators.redo());
      },
    ],
  ]);
  return (
    <Group gap="xs">
      <Tooltip label="Undo (Ctrl+Z)" position="top">
        <ActionIcon
          variant="light"
          size="lg"
          // onClick={() => dispatch(ActionCreators.undo())}
        >
          <IconArrowBackUp size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Redo (Shift+Ctrl+Z)" position="top">
        <ActionIcon
          variant="light"
          size="lg"
          // onClick={() => dispatch(ActionCreators.redo())}
        >
          <IconArrowForwardUp size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
