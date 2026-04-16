import {
  ActionIcon,
  Box,
  Button,
  CopyButton,
  Group,
  Loader,
  LoadingOverlay,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconCopy, IconShare, IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import { saveRemoteGame } from '@/games/save/saveRemoteGame';
import { shareGame } from './shareGame';

export interface IShareGameModalProps {
  gameId: string;
  opened: boolean;
  onClose: () => void;
}

export function ShareGameModal(props: IShareGameModalProps) {
  const { gameId, opened, onClose } = props;
  const [loading, setLoading] = useState(false);
  const savedId = useStore(state => state.games.games[gameId]?.savedId);
  const token = useStore(state => state.games.games[gameId]?.shareToken);
  const sharedUrl =
    savedId && token
      ? `${window.location.origin}/games/shared?gameSavedId=${savedId}&token=${encodeURIComponent(token)}`
      : null;

  const handleShare = async () => {
    setLoading(true);
    try {
      await shareGame(gameId);
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

  // When the modal opens, make sure the game is saved (so it has a savedId)
  // and that a share token exists, then generate / refresh as needed.
  useEffect(() => {
    if (!opened) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (!savedId) {
          await saveRemoteGame(gameId, { silent: true });
        }
        const currentToken =
          useStore.getState().games.games[gameId]?.shareToken;
        if (!currentToken && !cancelled) {
          await shareGame(gameId);
        }
      } catch (error: any) {
        console.error('Error preparing share link:', error);
        notifications.show({
          title: 'Error preparing share link',
          message: error?.message ?? error ?? 'Unknown error',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [opened, gameId, savedId]);

  return (
    <Modal title="Share game" size="md" opened={opened} onClose={onClose}>
      <Box pos="relative">
        <LoadingOverlay zIndex={1000} visible={loading} />
        {sharedUrl ? (
          <>
            <Text size="sm" mb="xs">
              Share this link with your friends to edit this game:
            </Text>
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
            <Paper
              radius="sm"
              bg="dark.6"
              withBorder
              mt="sm"
              p="sm"
              shadow="sm"
            >
              <Group gap="xs">
                <Text size="sm">
                  You can change the link at any time. Old links will stop
                  working, but friends who have already opened the game will
                  still be able to access it.
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
                      .eq('id', gameId);
                    useStore.getState().removeGameShareToken(gameId);

                    notifications.show({
                      icon: <IconCheck size={16} />,
                      color: 'orange',
                      title: 'Link removed',
                      message: 'Game link has been removed',
                    });

                    onClose();
                  }}
                >
                  Remove link
                </Button>
              </Group>
            </Paper>
          </>
        ) : (
          <Stack align="center" py="xl" gap="sm">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              Preparing your share link…
            </Text>
          </Stack>
        )}
      </Box>
    </Modal>
  );
}
