import * as React from 'react';
import { loglev } from '@/core/logger/log';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';

const logger = loglev.getLogger('auth');

export interface IAuthSessionManagerProps {}

export function AuthSessionManager(props: IAuthSessionManagerProps) {
  const setSession = useStore(state => state.setSession);

  React.useEffect(() => {
    supabaseClient.auth
      .getSession()
      .then(({ data: { session } }) => {
        logger.log('Loading Session:', session);
        setSession(session);
      })
      .catch(err => {
        console.warn('No session', err);
      });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      logger.info('Loading session from remote', _event);
      logger.log('Session Loaded from remote', session);

      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  return null;
}
