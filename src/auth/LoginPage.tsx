import { Button, Container } from '@mantine/core';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabaseClient } from '@/core/supabase';
import { useSession } from './authSelectors';

export interface ILoginPageProps {}

export function LoginPage(props: ILoginPageProps) {
  const session = useSession();

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
