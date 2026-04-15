import { Button, Group, Tooltip } from '@mantine/core';
import { IconNotebook } from '@tabler/icons-react';
import { useStore } from '@/core/zustand';
import { HotkeyKbd } from '@/utils/HotkeyKbd';

export function NotesPanelTrigger() {
  const isOpen = useStore(state => state.notesUi.isOpen);
  const toggle = useStore(state => state.toggleNotesPanel);

  return (
    <Tooltip
      color="dark"
      position="bottom"
      label={
        <Group gap={6} align="center" wrap="nowrap">
          <span style={{ lineHeight: 1 }}>Open notes</span>
          <HotkeyKbd keys={['Ctrl', 'J']} />
        </Group>
      }
      withArrow
    >
      <Button
        variant={isOpen ? 'light' : 'subtle'}
        color={isOpen ? 'blue' : 'gray'}
        size="xs"
        leftSection={<IconNotebook size={14} />}
        data-tutorial-id="notes-trigger"
        onClick={() => toggle()}
      >
        Notes
      </Button>
    </Tooltip>
  );
}
