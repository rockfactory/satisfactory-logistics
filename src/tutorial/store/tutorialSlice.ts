import { createSlice } from '@/core/zustand-helpers/slices';

export interface TutorialSlice {
  hasSeenWelcome: boolean;
  completedChapters: string[];
  lastChapterId?: string | null;
}

export const tutorialSlice = createSlice({
  name: 'tutorial',
  value: {
    hasSeenWelcome: false,
    completedChapters: [],
    lastChapterId: null,
  } as TutorialSlice,
  actions: {
    markWelcomeSeen: () => state => {
      state.hasSeenWelcome = true;
    },
    markChapterCompleted: (chapterId: string) => state => {
      if (!state.completedChapters.includes(chapterId)) {
        state.completedChapters.push(chapterId);
      }
      state.lastChapterId = chapterId;
    },
    setLastChapter: (chapterId: string | null) => state => {
      state.lastChapterId = chapterId;
    },
    resetTutorialProgress: () => state => {
      state.hasSeenWelcome = false;
      state.completedChapters = [];
      state.lastChapterId = null;
    },
  },
});
