import { Divider, Modal, Stack, Text } from '@mantine/core';
import React from 'react';
import { DiscordLoginButton } from './providers/DiscordLoginButton';
import { GoogleLoginButton } from './providers/GoogleLoginButton';

export interface ILoginModalProps {
  opened: boolean;
  close: () => void;
  message?: React.ReactNode;
}

export function LoginModal(props: ILoginModalProps) {
  const { opened, close, message } = props;
  return (
    <Modal
      size="sm"
      opened={opened}
      onClose={close}
      title="Authentication"
      // centered
    >
      <Stack gap="xs">
        <DiscordLoginButton />
        <GoogleLoginButton />
      </Stack>
      <Divider mt="xl" mb="md" />
      <Text ta="center" size="sm" c="dark.2">
        {message ??
          'After login you can save your factories on the server, so you can access them from any device.'}
      </Text>
    </Modal>
  );
}
