import { ActionIcon, Tooltip } from '@mantine/core';
import { IconNotebook } from '@tabler/icons-react';
import { useStore } from '@/core/zustand';

export function NotesPanelTrigger() {
  const isOpen = useStore(state => state.notesUi.isOpen);
  const toggle = useStore(state => state.toggleNotesPanel);

  return (
    <Tooltip label="Notes" withArrow>
      <ActionIcon
        variant={isOpen ? 'filled' : 'subtle'}
        color={isOpen ? 'blue' : 'gray'}
        size="lg"
        aria-label="Toggle notes panel"
        data-tutorial-id="notes-trigger"
        onClick={() => toggle()}
      >
        <IconNotebook size={20} />
      </ActionIcon>
    </Tooltip>
  );
}
