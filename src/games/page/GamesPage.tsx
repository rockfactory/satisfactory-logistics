import { useSession } from '@/auth/authSelectors';
import { useShallowStore, useStore } from '@/core/zustand';
import {
  Badge,
  Button,
  Container,
  Group,
  Paper,
  Space,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconCalendar, IconPlayerPlay } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { ImportExportGameModal } from '../import/ImportFactoriesModal';
import { GameDeleteButton } from './detail/GameDeleteButton';
import { GameDetailEditButton } from './detail/GameDetailEditButton';
import { GamePlayers } from './detail/GamePlayers';
import { ShareGamePanel } from './share/ShareGamePanel';

export interface IGamesPageProps {}

export function GamesPage(props: IGamesPageProps) {
  const selectedId = useStore(state => state.games.selected);
  const games = useShallowStore(state => Object.values(state.games.games));
  const navigate = useNavigate();
  const session = useSession();

  return (
    <div>
      <Container size="lg" mt="sm">
        <Title order={3} mb="md" ml="xs">
          Games
        </Title>
        <Stack gap="xs">
          {games.map(game => (
            <Paper
              key={game.id}
              p="md"
              shadow="xs"
              ml="xs"
              mr="xs"
              bg="dark.6"
              bd="1px solid dark.5"
            >
              <Stack gap="sm">
                <Group gap="xs" justify="space-between">
                  <Stack gap="xs">
                    <Group gap="xs" align="center">
                      {selectedId === game.id && (
                        <Badge color="green.9" radius="xs" size="md" mt={4}>
                          Active
                        </Badge>
                      )}
                      <Title order={4}>{game.name}</Title>
                      <GameDetailEditButton gameId={game.id} />
                      <GameDeleteButton gameId={game.id} />
                    </Group>
                    <Group gap="xs">
                      <Text size="xs" c="dark.2">
                        <Group gap={4} align="center">
                          <IconCalendar size={16} />{' '}
                          {dayjs(game.createdAt).format('DD/MM/YYYY HH:mm')}
                        </Group>
                      </Text>
                    </Group>
                  </Stack>
                  <Group gap="md">
                    <ImportExportGameModal gameId={game.id} />
                    <Button
                      variant="default"
                      size="sm"
                      leftSection={<IconPlayerPlay size={16} stroke={1.5} />}
                      onClick={() => {
                        useStore.getState().selectGame(game.id);
                        navigate(`/factories`);
                      }}
                    >
                      Play
                    </Button>
                  </Group>
                </Group>
                <Group justify="space-between">
                  <Group>
                    <GamePlayers gameId={game.id} />
                    {game.savedId && session && (
                      <ShareGamePanel gameId={game.id} />
                    )}
                  </Group>
                </Group>
              </Stack>
            </Paper>
          ))}
        </Stack>
        <Space mt={100} />
      </Container>
    </div>
  );
}
