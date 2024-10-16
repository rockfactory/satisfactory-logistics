import { useShallowStore, useStore } from '@/core/zustand';
import {
  Button,
  Container,
  Group,
  Paper,
  Space,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconCalendar,
  IconPlayerPlay,
  IconPlayerPlayFilled,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { ShareGamePanel } from './share/ShareGamePanel';

export interface IGamesPageProps {}

export function GamesPage(props: IGamesPageProps) {
  const selectedId = useStore(state => state.games.selected);
  const games = useShallowStore(state => Object.values(state.games.games));
  return (
    <div>
      <Container size="lg" mt="sm">
        <h1>Games</h1>
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
                  <Group gap="xs">
                    <Title order={4}>{game.name}</Title>
                  </Group>
                  <Group gap="md">
                    <Text size="sm" c="dark.2">
                      <Group gap={4} align="center">
                        <IconCalendar size={16} />{' '}
                        {dayjs(game.createdAt).format('DD/MM/YYYY HH:mm')}
                      </Group>
                    </Text>
                    {game.savedId && <ShareGamePanel gameId={game.id} />}
                    {selectedId === game.id ? (
                      <Button
                        color="orange"
                        size="sm"
                        variant="outline"
                        leftSection={
                          <IconPlayerPlayFilled size={16} stroke={1.5} />
                        }
                      >
                        Selected
                      </Button>
                    ) : (
                      <Button
                        color="orange"
                        size="sm"
                        leftSection={<IconPlayerPlay size={16} stroke={1.5} />}
                        onClick={() => {
                          useStore.getState().selectGame(game.id);
                        }}
                      >
                        Select
                      </Button>
                    )}
                  </Group>
                </Group>
              </Stack>
            </Paper>
          ))}
        </Stack>
        <Space mt="lg" />
      </Container>
    </div>
  );
}
