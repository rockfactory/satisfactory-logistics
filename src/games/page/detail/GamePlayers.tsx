import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import { ActionIcon, Avatar, Group } from '@mantine/core';
import type { QueryData } from '@supabase/supabase-js';
import { IconTrash } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

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
  const [players, setPlayers] = useState<GamePlayersData | null>(null);
  const [loading, setLoading] = useState(true);

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
  }, [gameSavedId]);

  if (!players) {
    return null;
  }

  return (
    <Group>
      <GamePlayerBadge player={players.author} />

      {players.shared_games.map(player => (
        <GamePlayerBadge player={player.user} />
      ))}
    </Group>
  );
}

function GamePlayerBadge(props: { player: GamePlayersData['author'] }) {
  const { player } = props;

  return (
    <Group gap="sm">
      <Avatar size={24} src={player?.avatar_url} />
      {player?.username}
      <ActionIcon variant="subtle" color="red" size="md">
        <IconTrash size={16} />
      </ActionIcon>
    </Group>
  );
}
