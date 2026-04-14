import { createSlice } from '@/core/zustand-helpers/slices';

export interface TutorialSlice {
  hasSeenWelcome: boolean;
  completedChapters: string[];
  lastChapterId?: string | null;
  demoFactoryId?: string | null;
  consumerFactoryId?: string | null;
  /**
   * When true, FactoryInputRow forces its usage Tooltip open regardless
   * of input focus. Used by the Linking factories tour to demonstrate
   * the usage panel without relying on a real keyboard focus (which
   * driver.js' overlay/focus management can swallow).
   */
  forceUsageTooltip?: boolean;
}

export const tutorialSlice = createSlice({
  name: 'tutorial',
  value: {
    hasSeenWelcome: false,
    completedChapters: [],
    lastChapterId: null,
    demoFactoryId: null,
    consumerFactoryId: null,
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
    setDemoFactoryId: (id: string | null) => state => {
      state.demoFactoryId = id;
    },
    setConsumerFactoryId: (id: string | null) => state => {
      state.consumerFactoryId = id;
    },
    setForceUsageTooltip: (force: boolean) => state => {
      state.forceUsageTooltip = force;
    },
    resetTutorialProgress: () => state => {
      state.hasSeenWelcome = false;
      state.completedChapters = [];
      state.lastChapterId = null;
      state.demoFactoryId = null;
      state.consumerFactoryId = null;
    },
  },
});
