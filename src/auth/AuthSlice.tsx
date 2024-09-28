import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Session } from '@supabase/supabase-js';
import { useSelector } from 'react-redux';
import { RootState } from '../core/store';

interface SyncState {
  isSynced: boolean;
  isSyncing: boolean;
  latestChangeDetectedAt: number;
  syncedAt: number;
  versionId: number | null;
}

export const authSlice = createSlice({
  name: 'auth',
  initialState: {
    session: null as Session | null,
    sync: {
      isSynced: false,
      latestChangeDetectedAt: 0,
      syncedAt: 0,
      versionId: null,
      isSyncing: false,
    } as SyncState,
  },
  reducers: {
    setSession: (state, action) => {
      state.session = action.payload;
    },
    setSync: (state, action: PayloadAction<Partial<SyncState>>) => {
      if (!state.sync)
        state.sync = {
          isSynced: false,
          syncedAt: 0,
          versionId: null,
          latestChangeDetectedAt: 0,
          isSyncing: false,
        };
      Object.assign(state.sync, action.payload);
    },
  },
});

export const authSliceReducer = authSlice.reducer;
export const authActions = authSlice.actions;

export const useSession = () =>
  useSelector((state: RootState) => state.auth.session);

export const useSync = () => useSelector((state: RootState) => state.auth.sync);
