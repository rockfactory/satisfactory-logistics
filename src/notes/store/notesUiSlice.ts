import { createSlice } from '@/core/zustand-helpers/slices';

export type NotesTab = 'game' | 'factory';

export interface NotesWindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NotesUiSlice {
  isOpen: boolean;
  activeTab: NotesTab;
  window: NotesWindowRect;
}

export const DEFAULT_NOTES_WINDOW: NotesWindowRect = {
  x: Math.max(16, window.innerWidth - 420),
  y: 96,
  width: 400,
  height: 520,
};

export const notesUiSlice = createSlice({
  name: 'notesUi',
  value: {
    isOpen: false,
    activeTab: 'game',
    window: DEFAULT_NOTES_WINDOW,
  } as NotesUiSlice,
  actions: {
    toggleNotesPanel: (open?: boolean) => state => {
      state.isOpen = open ?? !state.isOpen;
    },
    setNotesActiveTab: (tab: NotesTab) => state => {
      state.activeTab = tab;
    },
    setNotesWindowRect: (rect: Partial<NotesWindowRect>) => state => {
      state.window = { ...DEFAULT_NOTES_WINDOW, ...state.window, ...rect };
    },
  },
});
