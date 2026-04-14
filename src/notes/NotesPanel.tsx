import { Drawer, SegmentedControl, Stack, Text } from '@mantine/core';
import { useEffect } from 'react';
import { useStore } from '@/core/zustand';
import { useSelectedGameId } from '@/games/gamesSlice';
import { FactoryNotesEditor } from './FactoryNotesEditor';
import { GameNotesEditor } from './GameNotesEditor';
import classes from './NotesPanel.module.css';
import { useCurrentFactoryId } from './useNotesContext';

export function NotesPanel() {
  const isOpen = useStore(state => state.notesUi.isOpen);
  const activeTab = useStore(state => state.notesUi.activeTab);
  const toggleNotesPanel = useStore(state => state.toggleNotesPanel);
  const setNotesActiveTab = useStore(state => state.setNotesActiveTab);

  const gameId = useSelectedGameId();
  const factoryId = useCurrentFactoryId();
  const hasFactoryContext = factoryId != null;
  const resolvedTab = hasFactoryContext ? activeTab : 'game';

  useEffect(() => {
    if (!hasFactoryContext && activeTab === 'factory') {
      setNotesActiveTab('game');
    }
  }, [hasFactoryContext, activeTab, setNotesActiveTab]);

  return (
    <Drawer
      opened={isOpen}
      onClose={() => toggleNotesPanel(false)}
      position="right"
      size="md"
      title="Notes"
      withOverlay={false}
      lockScroll={false}
      trapFocus={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      classNames={{ content: classes.drawerContent, body: classes.body }}
    >
      {hasFactoryContext && (
        <SegmentedControl
          fullWidth
          value={resolvedTab}
          onChange={value => setNotesActiveTab(value as 'game' | 'factory')}
          data={[
            { label: 'Game', value: 'game' },
            { label: 'Factory', value: 'factory' },
          ]}
          data-tutorial-id="notes-tabs"
        />
      )}
      {!gameId && (
        <Text c="dimmed" size="sm">
          Select a game to start taking notes.
        </Text>
      )}
      {gameId && resolvedTab === 'game' && (
        <Stack gap="xs" className={classes.editorWrapper}>
          <GameNotesEditor />
        </Stack>
      )}
      {gameId && resolvedTab === 'factory' && factoryId && (
        <Stack gap="xs" className={classes.editorWrapper}>
          <FactoryNotesEditor factoryId={factoryId} />
        </Stack>
      )}
    </Drawer>
  );
}
