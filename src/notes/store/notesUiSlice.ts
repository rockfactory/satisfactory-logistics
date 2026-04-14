import { createSlice } from '@/core/zustand-helpers/slices';

export type NotesTab = 'game' | 'factory';

export interface NotesUiSlice {
  isOpen: boolean;
  activeTab: NotesTab;
}

export const notesUiSlice = createSlice({
  name: 'notesUi',
  value: {
    isOpen: false,
    activeTab: 'game',
  } as NotesUiSlice,
  actions: {
    toggleNotesPanel: (open?: boolean) => state => {
      state.isOpen = open ?? !state.isOpen;
    },
    setNotesActiveTab: (tab: NotesTab) => state => {
      state.activeTab = tab;
    },
  },
});
