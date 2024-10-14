import { createSlice } from '@/core/zustand-helpers/slices';

export const gameSaveSlice = createSlice({
  name: 'gameSave',
  value: {
    isSaving: false,
  },
  actions: {
    setIsSaving: (isSaving: boolean) => state => {
      state.isSaving = isSaving;
    },
  },
});
