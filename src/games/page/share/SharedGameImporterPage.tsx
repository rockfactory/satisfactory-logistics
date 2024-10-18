import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import type { SerializedGame } from '@/games/store/gameFactoriesActions';
import { Center, Container, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export interface ISharedGameImporterPageProps {}

export function SharedGameImporterPage(props: ISharedGameImporterPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const gameSavedId = searchParams.get('gameSavedId');

  useEffect(() => {
    async function loadSharedGame() {
      if (!gameSavedId || !token) {
        console.error('Missing gameId or token');
        return; // TODO Show error
      }

      const session = useStore.getState().auth.session;

      try {
        const { data, error } = await supabaseClient
          .from('games')
          .select('*')
          .setHeader('share_token', token)
          .eq('id', gameSavedId)
          .single();

        if (error) {
          throw error;
        }

        if (session && data.author_id !== session.user.id) {
          await supabaseClient
            .from('shared_games')
            .upsert({
              game_id: gameSavedId,
              user_id: session.user.id,
            })
            .select('game_id')
            .setHeader('share_token', token);
        }

        const serialized = data.data as unknown as SerializedGame;
        useStore.getState().loadRemoteGame(serialized, data);
        useStore.getState().selectGame(serialized.game.id);
        navigate('/games');
        // TODO better message
        notifications.show({
          title: 'Game loaded',
          message: 'Game loaded successfully',
        });
      } catch (error) {
        console.error('Error loading shared solver:', error);
        notifications.show({
          title: 'Error loading shared solver',
          message: (error as Error)?.message ?? 'Unknown error',
        });
        navigate('/factories/calculator');
      }
    }

    if (gameSavedId && token) {
      loadSharedGame();
    }
  }, [navigate, gameSavedId, token]);

  return (
    <div>
      <Container size="lg">
        <Center w="100%" p="xl">
          <Loader />
        </Center>
      </Container>
    </div>
  );
}
