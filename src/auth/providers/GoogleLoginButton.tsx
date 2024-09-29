import { Button } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBrandGoogleFilled } from '@tabler/icons-react';
import { useState } from 'react';
import { supabaseClient } from '../../core/supabase';

export interface IGoogleLoginButtonProps {}

export function GoogleLoginButton(props: IGoogleLoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const handleLogin = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) {
        throw error;
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to login with Google',
        color: 'red',
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button
      onClick={handleLogin}
      bg="white"
      c="dark.6"
      w={'100%'}
      loading={loading}
      leftSection={<IconBrandGoogleFilled size={18} />}
    >
      Log in with Google
    </Button>
  );
}
