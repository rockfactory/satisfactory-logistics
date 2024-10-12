import {
  ActionIcon,
  Alert,
  Button,
  CopyButton,
  Group,
  Modal,
  rem,
  Stack,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCopy, IconShare } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { useSession } from '../../auth/authSelectors';
import { LoginModal } from '../../auth/LoginModal';
import { Json } from '../../core/database.types';
import { supabaseClient } from '../../core/supabase';
import { useStore } from '../../core/zustand';
import { sharedSolverUUIDTranslator, SolverInstance } from '../store/Solver';
import { usePathSolverInstance } from '../store/solverSelectors';

export interface ISharedSolverData {
  // TODO Compress recipes
  instance: SolverInstance;
}

export interface ISolverShareButtonProps {}

export function SolverShareButton(props: ISolverShareButtonProps) {
  const instance = usePathSolverInstance();
  const session = useSession();

  const [loading, setLoading] = useState(false);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [opened, { toggle, open, close }] = useDisclosure();

  const [authOpened, { close: closeAuth, open: openAuth }] = useDisclosure();

  const handleShare = useCallback(async () => {
    if (!instance) {
      console.error('No instance to share');
      return;
    }

    if (!session) {
      //   notifications.show({
      //     title: 'You must be logged in to share a calculator',
      //     message: 'Log in now to share your calculator',
      //     color: 'blue',
      //   });
      openAuth();
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabaseClient
        .from('shared_solvers')
        .upsert({
          id: instance.sharedId ?? undefined,
          local_id: instance.id,
          user_id: session?.user.id,
          // We save only the request
          data: {
            instance,
          } as ISharedSolverData as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      console.log('Shared:', data);
      useStore.getState().saveSolverSharedId(instance.id, data.id);

      setSharedId(data.id);
      open();
    } catch (error) {
      console.error('Error sharing:', error);
      notifications.show({
        title: 'There was an error sharing the calculator',
        message:
          typeof error === 'object' && error != null && 'message' in error
            ? (error.message as string)
            : 'Unknown error',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [instance, open, openAuth, session]);

  const sharedUrl = sharedId
    ? `${window.location.origin}/factories/calculator/shared/${sharedSolverUUIDTranslator.fromUUID(sharedId)}`
    : '';

  return (
    <>
      <Button
        variant="filled"
        color="blue"
        size="sm"
        leftSection={<IconShare size={16} />}
        onClick={handleShare}
        loading={loading}
      >
        Share
      </Button>
      <LoginModal
        opened={authOpened}
        close={closeAuth}
        message={
          'You must be logged in to share a calculator. Log in now and share your calculator with others.'
        }
      />
      <Modal opened={opened} onClose={close} title="Shared">
        <Alert
          color="green"
          icon={<IconShare size={24} />}
          title="Shared Succesfully!"
        >
          <Stack gap="sm">
            Copy the link to share the calculator with others:
            <Group>
              <TextInput
                value={sharedUrl}
                w="100%"
                readOnly
                rightSection={
                  <CopyButton value={sharedUrl} timeout={2000}>
                    {({ copied, copy }) => (
                      <Tooltip
                        label={copied ? 'Copied' : 'Copy'}
                        withArrow
                        position="right"
                      >
                        <ActionIcon
                          color={copied ? 'teal' : 'gray'}
                          variant="subtle"
                          onClick={copy}
                        >
                          {copied ? (
                            <IconCheck style={{ width: rem(16) }} />
                          ) : (
                            <IconCopy style={{ width: rem(16) }} />
                          )}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                }
              />
            </Group>
          </Stack>
        </Alert>
      </Modal>
    </>
  );
}
