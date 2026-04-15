import { Button, Tooltip } from '@mantine/core';
import { IconNotebook } from '@tabler/icons-react';
import { useStore } from '@/core/zustand';

export function NotesPanelTrigger() {
  const isOpen = useStore(state => state.notesUi.isOpen);
  const toggle = useStore(state => state.toggleNotesPanel);

  return (
    <Tooltip label="Open notes (Ctrl+J)" withArrow>
      <Button
        variant={isOpen ? 'light' : 'subtle'}
        color={isOpen ? 'blue' : 'gray'}
        size="sm"
        leftSection={<IconNotebook size={16} />}
        data-tutorial-id="notes-trigger"
        onClick={() => toggle()}
      >
        Notes
      </Button>
    </Tooltip>
  );
}
