import { useSession } from '@/auth/authSelectors';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import { ActionIcon, Avatar, Group, Text } from '@mantine/core';
import type { QueryData } from '@supabase/supabase-js';
import { IconTrash } from '@tabler/icons-react';
import cx from 'clsx';
import { useEffect, useState } from 'react';
import classes from './GamePlayers.module.css';

export interface IGamePlayersProps {
  gameId: string;
}

const loadGamePlayers = (gameId: string) =>
  supabaseClient
    .from('games')
    .select(
      `id,
      shared_games (
        id,
        user:profiles (
          id,
            username,
            avatar_url
        ),
        game_id
      ),
      author:profiles (
        id, 
        username, 
        avatar_url
      )
    `,
    )
    .eq('id', gameId)
    .maybeSingle();

type GamePlayersData = QueryData<ReturnType<typeof loadGamePlayers>>;

export function GamePlayers(props: IGamePlayersProps) {
  const { gameId } = props;
  const gameSavedId = useStore(state => state.games.games[gameId].savedId);
  const session = useSession();
  const [players, setPlayers] = useState<GamePlayersData | null>(null);
  const [loading, setLoading] = useState(true);

  // Simple way to force refetch while not using react-query
  const [refetchCount, setRefetchCount] = useState(0);

  useEffect(() => {
    const fetchPlayers = async () => {
      if (!gameSavedId) {
        return;
      }

      setLoading(true);
      const { data, error } = await loadGamePlayers(gameSavedId!);
      if (error) {
        console.error('Error fetching players:', error);
        return;
      }

      setPlayers(data);
      setLoading(false);
    };

    fetchPlayers();
  }, [gameSavedId, refetchCount]);

  const handleDelete =
    session?.user.id == players?.author?.id
      ? async (playerId: string) => {
          console.log('Delete player', playerId);
          await supabaseClient
            .from('shared_games')
            .delete()
            .eq('game_id', gameSavedId!)
            .eq('user_id', playerId);

          setRefetchCount(count => count + 1);
        }
      : undefined;

  if (!players) {
    return null;
  }

  return (
    <Group>
      <GamePlayerBadge isAuthor player={players.author} />

      {players.shared_games.map(player => (
        <GamePlayerBadge player={player.user} onDelete={handleDelete} />
      ))}
    </Group>
  );
}

function GamePlayerBadge(props: {
  player: GamePlayersData['author'];
  isAuthor?: boolean;
  onDelete?: ((playerId: string) => void) | undefined;
}) {
  const { player, onDelete, isAuthor } = props;
  if (!player) {
    return null;
  }

  return (
    <Group
      gap="sm"
      className={cx(classes.gamePlayer, {
        [classes.gamePlayerAuthor]: isAuthor,
      })}
    >
      {isAuthor && (
        <Text size="sm" c="blue" fw={700}>
          Author
        </Text>
      )}
      <Avatar size={24} src={player.avatar_url} />
      <Text size="sm" fw={600}>
        {player.username}
      </Text>
      {onDelete && (
        <ActionIcon
          variant="subtle"
          color="red"
          size="sm"
          onClick={() => onDelete(player!.id)}
        >
          <IconTrash size={16} />
        </ActionIcon>
      )}
    </Group>
  );
}
