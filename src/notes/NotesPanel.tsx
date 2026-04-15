import { ActionIcon, Center, SegmentedControl, Text } from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import {
  IconBuildingFactory2,
  IconChevronDown,
  IconChevronUp,
  IconNotebook,
  IconWorld,
  IconX,
} from '@tabler/icons-react';
import { useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { useStore } from '@/core/zustand';
import { useFactory } from '@/factories/store/factoriesSlice';
import { useGameNotes, useSelectedGameId } from '@/games/gamesSlice';
import { FactoryNotesEditor } from './editor/FactoryNotesEditor';
import { GameNotesEditor } from './editor/GameNotesEditor';
import { hasNotesContent } from './hasNotesContent';
import classes from './NotesPanel.module.css';
import { DEFAULT_NOTES_WINDOW } from './store/notesUiSlice';
import { useCurrentFactoryId } from './useNotesContext';

const DRAG_HANDLE = 'notes-window-drag-handle';
const MIN_WIDTH = 280;
const MIN_HEIGHT = 240;
const COLLAPSED_HEIGHT = 44;

export function NotesPanel() {
  const isOpen = useStore(state => state.notesUi.isOpen);
  const isCollapsed = useStore(state => state.notesUi.isCollapsed ?? false);
  const activeTab = useStore(state => state.notesUi.activeTab);
  const windowRect = useStore(
    state => state.notesUi.window ?? DEFAULT_NOTES_WINDOW,
  );
  const toggleNotesPanel = useStore(state => state.toggleNotesPanel);
  const toggleNotesCollapsed = useStore(state => state.toggleNotesCollapsed);
  const setNotesActiveTab = useStore(state => state.setNotesActiveTab);
  const setNotesWindowRect = useStore(state => state.setNotesWindowRect);

  const gameId = useSelectedGameId();
  const factoryId = useCurrentFactoryId();
  const gameNotes = useGameNotes();
  const factory = useFactory(factoryId);
  const hasFactoryContext = factoryId != null;
  const resolvedTab = hasFactoryContext ? activeTab : 'game';
  const hasGameNotes = hasNotesContent(gameNotes);
  const hasFactoryNotes = hasNotesContent(factory?.notes);

  useHotkeys([['mod+j', () => toggleNotesPanel()]], [], true);

  useEffect(() => {
    if (!hasFactoryContext && activeTab === 'factory') {
      setNotesActiveTab('game');
    }
  }, [hasFactoryContext, activeTab, setNotesActiveTab]);

  if (!isOpen) return null;

  const effectiveHeight = isCollapsed ? COLLAPSED_HEIGHT : windowRect.height;

  return (
    <Rnd
      position={{ x: windowRect.x, y: windowRect.y }}
      size={{ width: windowRect.width, height: effectiveHeight }}
      minWidth={MIN_WIDTH}
      minHeight={isCollapsed ? COLLAPSED_HEIGHT : MIN_HEIGHT}
      bounds="window"
      dragHandleClassName={DRAG_HANDLE}
      enableResizing={!isCollapsed}
      onDragStop={(_e, d) => setNotesWindowRect({ x: d.x, y: d.y })}
      onResizeStop={(_e, _dir, ref, _delta, pos) =>
        setNotesWindowRect({
          x: pos.x,
          y: pos.y,
          width: ref.offsetWidth,
          height: ref.offsetHeight,
        })
      }
      resizeHandleClasses={{
        bottomRight: classes.resizeHandleBR,
        right: classes.resizeHandleEdge,
        bottom: classes.resizeHandleEdge,
        left: classes.resizeHandleEdge,
        top: classes.resizeHandleEdge,
      }}
      style={{ zIndex: 300 }}
    >
      <div className={classes.window} data-tutorial-id="notes-panel">
        <div className={`${classes.header} ${DRAG_HANDLE}`}>
          <IconNotebook size={16} className={classes.titleIcon} stroke={1.75} />
          {hasFactoryContext && !isCollapsed ? (
            <SegmentedControl
              size="xs"
              radius="md"
              value={resolvedTab}
              onChange={value => setNotesActiveTab(value as 'game' | 'factory')}
              data={[
                {
                  value: 'game',
                  label: (
                    <Center style={{ gap: 6 }}>
                      <IconWorld size={14} />
                      <span>Game</span>
                      {hasGameNotes && <span className={classes.tabDot} />}
                    </Center>
                  ),
                },
                {
                  value: 'factory',
                  label: (
                    <Center style={{ gap: 6 }}>
                      <IconBuildingFactory2 size={14} />
                      <span>Factory</span>
                      {hasFactoryNotes && <span className={classes.tabDot} />}
                    </Center>
                  ),
                },
              ]}
              data-tutorial-id="notes-tabs"
            />
          ) : (
            <span className={classes.title}>Notes</span>
          )}
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() => toggleNotesCollapsed()}
            aria-label={isCollapsed ? 'Expand notes' : 'Collapse notes'}
            data-tutorial-id="notes-collapse"
          >
            {isCollapsed ? (
              <IconChevronUp size={16} />
            ) : (
              <IconChevronDown size={16} />
            )}
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() => toggleNotesPanel(false)}
            aria-label="Close notes"
          >
            <IconX size={16} />
          </ActionIcon>
        </div>
        {!isCollapsed && (
          <div className={classes.body}>
            {!gameId && (
              <Text c="dimmed" size="sm">
                Select a game to start taking notes.
              </Text>
            )}
            {gameId && resolvedTab === 'game' && (
              <div className={classes.editorWrapper}>
                <GameNotesEditor />
              </div>
            )}
            {gameId && resolvedTab === 'factory' && factoryId && (
              <div className={classes.editorWrapper}>
                <FactoryNotesEditor factoryId={factoryId} />
              </div>
            )}
          </div>
        )}
        {!isCollapsed && <div className={classes.resizeHint} aria-hidden />}
      </div>
    </Rnd>
  );
}
