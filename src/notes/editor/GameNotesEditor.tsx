import { useDebouncedCallback } from '@mantine/hooks';
import type { JSONContent } from '@tiptap/react';
import { useStore } from '@/core/zustand';
import { useGameNotes, useSelectedGameId } from '@/games/gamesSlice';
import { NotesEditor } from './NotesEditor';

export function GameNotesEditor() {
  const gameId = useSelectedGameId();
  const gameNotes = useGameNotes();
  const setGameNotes = useStore(state => state.setGameNotes);

  const save = useDebouncedCallback((value: JSONContent) => {
    if (!gameId) return;
    setGameNotes(gameId, value);
  }, 400);

  if (!gameId) return null;

  return (
    <NotesEditor
      entityKey={`game:${gameId}`}
      content={gameNotes}
      onChange={save}
    />
  );
}
