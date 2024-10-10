import { Session } from 'inspector/promises';
import { createSliceWithImmer } from 'zustand-slices/immer';

export const authSlice = createSliceWithImmer({
  name: 'auth',
  value: {
    session: null as Session | null,
    sync: {
      isSynced: false,
      latestChangeDetectedAt: 0,
      syncedAt: 0,
      versionId: null,
      isSyncing: false,
    },
  },
  actions: {
    setSession: (session: Session | null) => state => {
      state.session = session;
    },
  },
});
