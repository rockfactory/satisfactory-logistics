import { Button, Container } from '@mantine/core';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../core/store';
import { supabaseClient } from '../core/supabase';

export interface ILoginPageProps {}

export function LoginPage(props: ILoginPageProps) {
  const session = useSelector((state: RootState) => state.auth.session);
  const dispatch = useDispatch();

  // useEffect(() => {
  //   supabaseClient.auth.getSession().then(({ data: { session } }) => {
  //     dispatch(authActions.setSession(session));
  //   });

  //   const {
  //     data: { subscription },
  //   } = supabaseClient.auth.onAuthStateChange((_event, session) => {
  //     dispatch(authActions.setSession(session));
  //   });

  //   return () => subscription.unsubscribe();
  // }, []);

  if (!session) {
    return (
      <Container size="sm" mt="xl">
        <Auth
          supabaseClient={supabaseClient}
          providers={['discord']}
          onlyThirdPartyProviders
          appearance={{ theme: ThemeSupa }}
        />
      </Container>
    );
  } else {
    return (
      <div>
        Logged in!
        <Button
          onClick={async () => {
            await supabaseClient.auth.signOut();
          }}
        >
          Logout
        </Button>
      </div>
    );
  }
}
