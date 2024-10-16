import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import type { Factory } from '@/factories/Factory';
import type { GameSettings } from '@/games/Game';
import type { SolverInstance } from '@/solver/store/Solver';
import { notifications } from '@mantine/notifications';
import { Session } from '@supabase/supabase-js';
import { v4 } from 'uuid';

interface IV020SerializedState {
  factories?: {
    factories?: Factory[];
    settings?: GameSettings;
  };
  solver?: {
    instances?: Record<string, SolverInstance>;
  };
}

/**
 * Used only for loading old data from remote.
 * @deprecated
 */
export async function loadFromOldRemote(
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

  let gameId = useStore.getState().games.selected;
  if (!gameId) {
    gameId = v4();
    useStore.getState().createGame(gameId, {
      name: 'Savegame 1',
    });
  }

  const serialized = data.data as unknown as IV020SerializedState;
  const game = useStore.getState().games.games[gameId];
  useStore.getState().loadGame({
    game: {
      ...game,
      settings: serialized.factories?.settings ?? game.settings,
      createdAt: new Date(data!.created_at),
      factoriesIds:
        serialized.factories?.factories?.map(factory => factory.id) ?? [],
    },
    factories:
      serialized.factories?.factories?.map(factory => ({
        ...factory,
        inputs: factory.inputs ?? [],
        outputs: factory.outputs ?? [],
      })) ?? [],
    solvers: Object.values(serialized.solver?.instances ?? {}),
  });

  const remoteUpdatedAt = new Date(data!.updated_at).getTime();

  // const localUpdatedAt =
  //   store.getState().auth?.sync?.latestChangeDetectedAt ?? 0;
  // const isRemoteNewerThanLocal =
  //   forceRemote || remoteUpdatedAt > localUpdatedAt;

  // console.log('Setting versionId:', data?.id, 'is remote newer?', isRemoteNewerThanLocal); // prettier-ignore
  // store.dispatch(
  //   authActions.setSync({
  //     versionId: data?.id,
  //     syncedAt: remoteUpdatedAt,
  //     isSynced: true,
  //     latestChangeDetectedAt: isRemoteNewerThanLocal
  //       ? remoteUpdatedAt
  //       : localUpdatedAt,
  //   }),
  // );

  // const remoteState = data?.data as unknown as ISerializedState;

  // if (isRemoteNewerThanLocal) {
  //   console.log('Loading from remote:', remoteState);
  //   store.dispatch(factoryActions.loadFromRemote(remoteState.factories));
  //   if (remoteState.solver) {
  //     store.dispatch(solverActions.loadFromRemote(remoteState.solver));
  //   }
  // }
}
