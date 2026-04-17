import { Alert, Divider, Modal, Stack, Text } from '@mantine/core';
import { IconCloudOff } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useIsOnline } from '@/pwa/useNetworkStatus';
import { DiscordLoginButton } from './providers/DiscordLoginButton';
import { GoogleLoginButton } from './providers/GoogleLoginButton';

export interface ILoginModalProps {
  opened: boolean;
  close: () => void;
  message?: ReactNode;
}

export function LoginModal(props: ILoginModalProps) {
  const { opened, close, message } = props;
  const isOnline = useIsOnline();
  return (
    <Modal size="sm" opened={opened} onClose={close} title="Authentication">
      {isOnline ? (
        <>
          <Stack gap="xs">
            <DiscordLoginButton />
            <GoogleLoginButton />
          </Stack>
          <Divider mt="xl" mb="md" />
          <Text ta="center" size="sm" c="dark.2">
            {message ??
              'After login you can save your factories on the server, so you can access them from any device.'}
          </Text>
        </>
      ) : (
        <Alert
          color="yellow"
          icon={<IconCloudOff size={18} />}
          title="You're offline"
        >
          Sign in requires an internet connection. Reconnect and try again.
        </Alert>
      )}
    </Modal>
  );
}
