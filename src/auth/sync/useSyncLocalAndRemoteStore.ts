import { notifications } from '@mantine/notifications';
import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Json } from '../../core/database.types';
import { RootState, store } from '../../core/store';
import { supabaseClient } from '../../core/supabase';
import { useFactories } from '../../factories/store/FactoriesSlice';
import { authActions, useSession, useSync } from '../AuthSlice';
import { loadFromRemote } from './loadFromRemote';

export interface ISerializedState {
  // We serialize only the _current_ state, not the whole state with undo history
  factories: RootState['factories']['present'];
  solver?: RootState['solver']['present'];
}

export async function saveLocalState() {
  const { auth, factories, solver } = store.getState();
  if (!auth.session) {
    console.log('No session, skipping save, previous at ' + auth.sync.syncedAt);
  }

  // if (Date.now() - auth.sync.syncedAt < 15_000) {
  //   console.log('Skipping save, previous at ' + auth.sync.syncedAt);
  //   return;
  // }

  store.dispatch(
    authActions.setSync({
      isSyncing: true,
    }),
  );

  const { data, error } = await supabaseClient
    .from('factories')
    .upsert({
      id: auth.sync?.versionId ?? undefined,
      user_id: auth?.session?.user.id,
      // We save only the _current_ state, not the whole state with undo history
      data: {
        factories: factories.present,
        solver: solver.present,
      } as ISerializedState as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error syncing factories:', error);
    notifications.show({
      title: 'Error syncing factories',
      message: error.message,
    });
    store.dispatch(
      authActions.setSync({
        isSyncing: false,
      }),
    );
    return;
  }

  console.log('Saved factories to remote:', data);
  store.dispatch(
    authActions.setSync({
      isSynced: true,
      isSyncing: false,
      syncedAt: Date.now(),
      versionId: data?.id,
    }),
  );
}

// Minimum interval between syncs
const SAVE_INTERVAL = 30_000;

export function useSyncLocalAndRemoteStore() {
  const session = useSession();
  const sync = useSync();
  const dispatch = useDispatch();
  const factories = useFactories();

  const updatedAt = useRef(0);
  const latestSessionId = useRef(null as string | null);
  const isFetching = useRef(false);
  useEffect(() => {
    async function update() {
      if (Date.now() - updatedAt.current < SAVE_INTERVAL) {
        dispatch(
          authActions.setSync({
            isSynced: false,
            latestChangeDetectedAt: Date.now(),
          }),
        );
        console.log('Skipping sync');
      }

      dispatch(
        authActions.setSync({
          latestChangeDetectedAt: Date.now(),
        }),
      );
      //   await saveLocalState();

      updatedAt.current = Date.now();
    }

    update().catch(console.error);
  }, [factories, dispatch]);

  useEffect(() => {
    if (!session || session?.user.id === latestSessionId.current) {
      console.log('Skipping sync, same session', session);
      return;
    }

    latestSessionId.current = session?.user.id;
    loadFromRemote(session).catch(console.error);
  }, [session]);
}
