import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import {
  ActionIcon,
  Box,
  Button,
  CopyButton,
  Group,
  LoadingOverlay,
  Modal,
  Paper,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCopy, IconShare, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { shareGame } from './shareGame';

export interface IShareGamePanelProps {
  gameId: string;
}

export function ShareGamePanel(props: IShareGamePanelProps) {
  const [loading, setLoading] = useState(false);
  const [opened, { close, open }] = useDisclosure();
  const savedId = useStore(state => state.games.games[props.gameId].savedId);
  const token = useStore(state => state.games.games[props.gameId].shareToken);
  const sharedUrl = token
    ? `${window.location.origin}/games/shared?gameSavedId=${savedId}&token=${encodeURIComponent(token)}`
    : null;

  // TODO COnfirm old link will stop working
  const handleShare = async () => {
    setLoading(true);
    try {
      await shareGame(props.gameId);
    } catch (error: any) {
      console.error('Error sharing game:', error);
      notifications.show({
        title: 'Error sharing game',
        message: error?.message ?? error ?? 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    open();
    if (!token) {
      handleShare().catch(console.error);
    }
  };

  if (!savedId) {
    return null;
  }

  return (
    <Group>
      <Button
        onClick={handleOpen}
        disabled={loading}
        color="blue"
        leftSection={<IconShare size={16} />}
      >
        Share game
      </Button>
      <Modal title="Share game" size="md" opened={opened} onClose={close}>
        <Box pos="relative">
          <LoadingOverlay zIndex={1000} visible={loading} />
          <Text size="sm" mb="xs">
            Share this link with your friends to edit this game:
          </Text>
          <TextInput
            value={sharedUrl ?? ''}
            w="100%"
            readOnly
            rightSection={
              <CopyButton value={sharedUrl ?? ''} timeout={2000}>
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
                        <IconCheck size={16} />
                      ) : (
                        <IconCopy size={16} />
                      )}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            }
          />
          <Paper radius="sm" bg="dark.6" withBorder mt="sm" p="sm" shadow="sm">
            <Group gap="xs">
              <Text size="sm">
                You can change the link at any time. Old links will stop
                working, but friends who have already opened the game will still
                be able to access it.
              </Text>
              <Button
                leftSection={<IconShare size={16} />}
                variant="light"
                color="blue"
                onClick={handleShare}
              >
                Refresh link
              </Button>
              <Button
                leftSection={<IconTrash size={16} />}
                variant="light"
                color="red"
                onClick={async () => {
                  await supabaseClient
                    .from('games')
                    .update({ share_token: null })
                    .eq('id', props.gameId);
                  useStore.getState().removeGameShareToken(props.gameId);

                  notifications.show({
                    icon: <IconCheck size={16} />,
                    color: 'orange',
                    title: 'Link removed',
                    message: 'Game link has been removed',
                  });

                  close();
                }}
              >
                Remove link
              </Button>
            </Group>
          </Paper>
        </Box>
      </Modal>
    </Group>
  );
}
