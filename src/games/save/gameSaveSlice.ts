import { createSlice } from '@/core/zustand-helpers/slices';

export const gameSaveSlice = createSlice({
  name: 'gameSave',
  value: {
    hasRehydratedLocalData: false,
    isSaving: false,
    isLoading: false,
    isRealtimeSyncConnected: false,
  },
  actions: {
    setIsSaving: (isSaving: boolean) => state => {
      state.isSaving = isSaving;
    },
    setIsLoading: (isLoading: boolean) => state => {
      state.isLoading = isLoading;
    },
    setHasRehydratedLocalData: (hasRehydratedLocalData: boolean) => state => {
      state.hasRehydratedLocalData = hasRehydratedLocalData;
    },
    setRealtimeSyncConnected: (isRealtimeSyncConnected: boolean) => state => {
      state.isRealtimeSyncConnected = isRealtimeSyncConnected;
    },
  },
});
