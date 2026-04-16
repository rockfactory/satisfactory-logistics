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
  isCollapsed: boolean;
  activeTab: NotesTab;
  window: NotesWindowRect;
}

export const DEFAULT_NOTES_WINDOW: NotesWindowRect = {
  x: Math.max(16, window.innerWidth - 420),
  y: 96,
  width: 400,
  height: 520,
};

const NOTES_MIN_WIDTH = 280;
const NOTES_MIN_HEIGHT = 240;
const NOTES_VIEWPORT_MARGIN = 16;

export function clampNotesRectToViewport(
  rect: NotesWindowRect,
): NotesWindowRect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.max(
    NOTES_MIN_WIDTH,
    Math.min(rect.width, vw - NOTES_VIEWPORT_MARGIN * 2),
  );
  const height = Math.max(
    NOTES_MIN_HEIGHT,
    Math.min(rect.height, vh - NOTES_VIEWPORT_MARGIN * 2),
  );
  const maxX = Math.max(
    NOTES_VIEWPORT_MARGIN,
    vw - width - NOTES_VIEWPORT_MARGIN,
  );
  const maxY = Math.max(
    NOTES_VIEWPORT_MARGIN,
    vh - height - NOTES_VIEWPORT_MARGIN,
  );
  return {
    x: Math.min(Math.max(rect.x, NOTES_VIEWPORT_MARGIN), maxX),
    y: Math.min(Math.max(rect.y, NOTES_VIEWPORT_MARGIN), maxY),
    width,
    height,
  };
}

export const notesUiSlice = createSlice({
  name: 'notesUi',
  value: {
    isOpen: false,
    isCollapsed: false,
    activeTab: 'game',
    window: DEFAULT_NOTES_WINDOW,
  } as NotesUiSlice,
  actions: {
    toggleNotesPanel: (open?: boolean) => state => {
      const nextIsOpen = open ?? !state.isOpen;
      // Re-clamp the stored rect against the current viewport so a window
      // saved from a larger screen (or before a browser resize) can still
      // be reached when reopened.
      if (nextIsOpen && !state.isOpen) {
        state.window = clampNotesRectToViewport(
          state.window ?? DEFAULT_NOTES_WINDOW,
        );
      }
      state.isOpen = nextIsOpen;
    },
    toggleNotesCollapsed: (collapsed?: boolean) => state => {
      state.isCollapsed = collapsed ?? !state.isCollapsed;
    },
    setNotesActiveTab: (tab: NotesTab) => state => {
      state.activeTab = tab;
    },
    setNotesWindowRect: (rect: Partial<NotesWindowRect>) => state => {
      state.window = { ...DEFAULT_NOTES_WINDOW, ...state.window, ...rect };
    },
  },
});
