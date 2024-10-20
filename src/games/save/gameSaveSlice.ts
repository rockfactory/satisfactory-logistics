import { createSlice } from '@/core/zustand-helpers/slices';

export const gameSaveSlice = createSlice({
  name: 'gameSave',
  value: {
    isSaving: false,
    isLoading: false,
  },
  actions: {
    setIsSaving: (isSaving: boolean) => state => {
      state.isSaving = isSaving;
    },
    setIsLoading: (isLoading: boolean) => state => {
      state.isLoading = isLoading;
    },
  },
});
