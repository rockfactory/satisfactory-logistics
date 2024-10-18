import { useSession } from '@/auth/authSelectors';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import { ActionIcon, Button, Group, Modal, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconTrash } from '@tabler/icons-react';

export interface IGameDeleteButtonProps {
  gameId: string;
}

export function GameDeleteButton(props: IGameDeleteButtonProps) {
  const [opened, { toggle, open, close }] = useDisclosure();

  const gameName = useStore(
    state => state.games.games[props.gameId ?? '']?.name,
  );
  const isSaved = useStore(
    state => !!state.games.games[props.gameId ?? '']?.savedId,
  );
  const authorId = useStore(
    state => state.games.games[props.gameId ?? '']?.authorId,
  );
  const session = useSession();

  const handleDelete = async () => {
    const game = useStore.getState().games.games[props.gameId ?? ''];
    if (!game) {
      throw new Error('No game found');
    }

    if (session && game.savedId && authorId === session.user?.id) {
      // Delete remote saved game
      await supabaseClient.from('games').delete().eq('id', game.savedId);
    }

    useStore.getState().removeGame(props.gameId);

    notifications.show({
      title: 'Game deleted',
      message: `Game ${game.name} was successfully deleted`,
      color: 'orange',
    });
    close();
  };

  return (
    <>
      <ActionIcon color="red" variant="subtle" onClick={open} size="md">
        <IconTrash size={16} />
      </ActionIcon>
      <Modal
        title="Delete Game"
        size="sm"
        padding="md"
        opened={opened}
        onClose={close}
      >
        <Text size="sm">
          Are you sure you want to delete the game <strong>{gameName}</strong>?
          <br />
          {isSaved && session && 'This will delete the remote saved game too.'}
        </Text>
        <Group mt="md" gap="xs" justify="flex-end">
          <Button onClick={close} variant="default">
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            variant="filled"
            color="red"
            leftSection={<IconTrash size={16} />}
          >
            Delete
          </Button>
        </Group>
      </Modal>
    </>
  );
}
