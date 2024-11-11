import { Session } from '@supabase/supabase-js';
import { createSlice } from '@/core/zustand-helpers/slices';

export const authSlice = createSlice({
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
