import { serializeGame } from '@/games/store/gameFactoriesActions';
import { notifications } from '@mantine/notifications';
import { Json } from '../../core/database.types';
import { supabaseClient } from '../../core/supabase';
import { useStore } from '../../core/zustand';
import { Factory } from '../../factories/Factory';
import { Game } from '../../games/Game';
import { SolverInstance } from '../../solver/store/Solver';

export interface ISerializedState {
  // We serialize only the _current_ state, not the whole state with undo history
  // TODO Restore typings and support saving. We need to be careful with previous versions
  game: Game;
  factories: Record<string, Factory>;
  solvers: Record<string, SolverInstance>;
}

export async function saveLocalState() {
  const { auth, factories, solvers } = useStore.getState();
  if (!auth.session) {
    console.log('No session, skipping save, previous at ' + auth.sync.syncedAt);
  }

  // if (Date.now() - auth.sync.syncedAt < 15_000) {
  //   console.log('Skipping save, previous at ' + auth.sync.syncedAt);
  //   return;
  // }

  // TODO Restore
  // store.dispatch(
  //   authActions.setSync({
  //     isSyncing: true,
  //   }),
  // );

  const state = useStore.getState();
  const game = state.games.games[state.games.selected ?? ''];
  if (!game) {
    console.error('No game, skipping save');
    notifications.show({
      title: 'Error saving game',
      message: 'No game selected',
    });
    return;
  }

  const { data, error } = await supabaseClient
    .from('games')
    .upsert({
      id: game.savedId ?? undefined,
      author_id: game.authorId ?? auth.session!.user.id,
      name: game.name,
      // We save only the _current_ state, not the whole state with undo history
      data: serializeGame(game.id) as unknown as Json,
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
    // TODO Restore
    // store.dispatch(
    //   authActions.setSync({
    //     isSyncing: false,
    //   }),
    // );
    return;
  }

  console.log('Saved factories to remote:', data);
  // TODO add date?
  // useStore.getState().setSavedGameId(game.id, data?.id);
}

// Minimum interval between syncs
const SAVE_INTERVAL = 30_000;

export function useSyncLocalAndRemoteStore() {
  // const session = useSession();
  // const sync = useSync();
  // const dispatch = useDispatch();
  // const factories = useFactories();
  // const updatedAt = useRef(0);
  // const latestSessionId = useRef(null as string | null);
  // const isFetching = useRef(false);
  // useEffect(() => {
  //   async function update() {
  //     if (Date.now() - updatedAt.current < SAVE_INTERVAL) {
  //       dispatch(
  //         authActions.setSync({
  //           isSynced: false,
  //           latestChangeDetectedAt: Date.now(),
  //         }),
  //       );
  //       console.log('Skipping sync');
  //     }
  //     dispatch(
  //       authActions.setSync({
  //         latestChangeDetectedAt: Date.now(),
  //       }),
  //     );
  //     //   await saveLocalState();
  //     updatedAt.current = Date.now();
  //   }
  //   update().catch(console.error);
  // }, [factories, dispatch]);
  // useEffect(() => {
  //   if (!session || session?.user.id === latestSessionId.current) {
  //     console.log('Skipping sync, same session', session);
  //     return;
  //   }
  //   latestSessionId.current = session?.user.id;
  //   loadFromRemote(session).catch(console.error);
  // }, [session]);
}
