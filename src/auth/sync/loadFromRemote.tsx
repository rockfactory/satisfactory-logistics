import { notifications } from '@mantine/notifications';
import { Session } from '@supabase/supabase-js';
import { store } from '../../core/store';
import { supabaseClient } from '../../core/supabase';
import { factoryActions } from '../../factories/store/FactoriesSlice';
import { solverActions } from '../../recipes/solver/store/SolverSlice';
import { authActions } from '../AuthSlice';
import { ISerializedState } from './useSyncLocalAndRemoteStore';

export async function loadFromRemote(
  session: Session | null,
  forceRemote = false,
) {
  if (!session) {
    console.log('No session');
    return;
  }

  console.log('Fetching factories for', session.user.id);
  const { data, error } = await supabaseClient
    .from('factories')
    .select('*')
    .eq('user_id', session.user.id)
    .limit(1)
    .maybeSingle();

  console.log('Fetched factories:', data, error);

  if (error) {
    console.error('Error fetching factories:', error);
    notifications.show({
      title: 'Error fetching user',
      message: `Cannot sync factories. Using local storage.`,
    });
    return;
  }

  if (!data) {
    console.log('No factories found');
    return;
  }

  const remoteUpdatedAt = new Date(data!.updated_at).getTime();
  const localUpdatedAt =
    store.getState().auth?.sync?.latestChangeDetectedAt ?? 0;
  const isRemoteNewerThanLocal =
    forceRemote || remoteUpdatedAt > localUpdatedAt;

  console.log('Setting versionId:', data?.id, 'is remote newer?', isRemoteNewerThanLocal); // prettier-ignore
  store.dispatch(
    authActions.setSync({
      versionId: data?.id,
      syncedAt: remoteUpdatedAt,
      isSynced: true,
      latestChangeDetectedAt: isRemoteNewerThanLocal
        ? remoteUpdatedAt
        : localUpdatedAt,
    }),
  );

  const remoteState = data?.data as unknown as ISerializedState;

  if (isRemoteNewerThanLocal) {
    console.log('Loading from remote:', remoteState);
    store.dispatch(factoryActions.loadFromRemote(remoteState.factories));
    if (remoteState.solver) {
      store.dispatch(solverActions.loadFromRemote(remoteState.solver));
    }
  }
}
