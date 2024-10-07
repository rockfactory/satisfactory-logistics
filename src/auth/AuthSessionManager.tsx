import * as React from 'react';
import { useDispatch } from 'react-redux';
import { supabaseClient } from '../core/supabase';
import { authActions } from './AuthSlice';

export interface IAuthSessionManagerProps {}

export function AuthSessionManager(props: IAuthSessionManagerProps) {
  //   const session = useSelector((state: RootState) => state.auth.session);
  const dispatch = useDispatch();

  React.useEffect(() => {
    supabaseClient.auth
      .getSession()
      .then(({ data: { session } }) => {
        console.log('Loading Session:', session);
        dispatch(authActions.setSession(session));
      })
      .catch(err => {
        console.warn('No session', err);
      });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      // Load factories from remote
      console.log('Loading from remote', _event);
      // await loadFromRemote(session);
      console.log('Session Loaded from remote', session);

      dispatch(authActions.setSession(session));
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  return null;
}
