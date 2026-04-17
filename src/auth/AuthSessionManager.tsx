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
      logger.info(
        `onAuthStateChange event=${_event} userId=${session?.user?.id ?? 'none'} tokenTail=${session?.access_token?.slice(-8) ?? 'none'}`,
      );
      logger.log('Session Loaded from remote', session);

      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  return null;
}
