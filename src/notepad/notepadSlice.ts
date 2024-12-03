import { useStore } from '@/core/zustand';
import { createSlice } from '@/core/zustand-helpers/slices';
interface NotepadSlice {
  notes: Record<string, Note>;
}

export interface Note {
  id: string;
  reference: string;
  text: string;
  referenceType: "factory" | "game";
}

export const notepadSlice = createSlice({
  name: 'notepad',
  value: {
    notes: {},
  } as NotepadSlice,
  actions: {
    addNote: (id: string, fn: (notepad: Note) => void) => state => {
      fn(state.notes[id]);
    },
    updateNote: (id: string, note: Partial<Note>) => state => {
      Object.assign(state.notes[id], note);
    }
  },
});
