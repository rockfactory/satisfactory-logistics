import { Button } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBrandDiscordFilled } from '@tabler/icons-react';
import { useState } from 'react';
import { supabaseClient } from '@/core/supabase';

export interface IDiscordLoginButtonProps {}

export function DiscordLoginButton(props: IDiscordLoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const handleLogin = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'discord',
      });
      if (error) {
        throw error;
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to login with Discord',
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
      bg="#7289da"
      w={'100%'}
      loading={loading}
      leftSection={<IconBrandDiscordFilled size={18} />}
    >
      Log in with Discord
    </Button>
  );
}
