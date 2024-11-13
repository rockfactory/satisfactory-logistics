import {
  Button,
  Container,
  Divider,
  Group,
  Space,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconBuildingFactory,
  IconCalculator,
  IconDeviceGamepad,
  IconPlus,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useSession } from '@/auth/authSelectors';
// import { loadFromRemote } from '../auth/sync/loadFromRemote';
import { Link, useNavigate } from 'react-router-dom';
import { v4 } from 'uuid';
import { useStore } from '@/core/zustand';
import { useGameFactoriesIds } from '@/games/gamesSlice';
import { GameSettingsModal } from '@/games/settings/GameSettingsModal';
import classes from './FactoriesTab.module.css';
import { FactoryRow } from './FactoryRow';
import { FactoriesFiltersMenu } from './filters/FactoriesFiltersMenu';
import { FactoryWideCard } from './wide/FactoryWideCard';

export interface IFactoriesTabProps {}

export function FactoriesTab(_props: IFactoriesTabProps) {
  const session = useSession();
  const navigate = useNavigate();

  const gameId = useStore(state => state.games.selected);
  const viewMode = useStore(state => state.factoryView.viewMode ?? 'wide');

  const [loadingFactories, setLoadingFactories] = useState(false);

  const hasFactories = useStore(
    state =>
      Object.keys(state.games.games).length > 0 &&
      state.games.selected &&
      state.games.games[state.games.selected]?.factoriesIds.length > 0,
  );
  const factoriesIds = useGameFactoriesIds(gameId);

  return (
    <div>
      <FactoriesFiltersMenu />

      <Container size="lg" mt="lg">
        {!hasFactories && (
          <Stack gap="xs" align="center" mih={200} mt={60} mb={90}>
            <IconBuildingFactory size={64} stroke={1.2} />
            <Text fz="h2">Let's build some factories!</Text>
            <Text size="sm" c="dark.2">
              Add factories to start planning your logistics.
            </Text>
            <Button
              leftSection={<IconPlus size={16} />}
              mt="lg"
              size="lg"
              onClick={() =>
                gameId
                  ? useStore.getState().addGameFactory(gameId)
                  : // TODO This technically should not be possible
                    useStore.getState().initGame({})
              }
            >
              Add first factory
            </Button>

            <Divider
              w="60%"
              mt="lg"
              mb="lg"
              classNames={{ label: classes.emptyDividerLabel }}
              label="Do you want to import your factories from this or another tool?"
            />
            <Button
              component={Link}
              variant="light"
              size="lg"
              leftSection={<IconDeviceGamepad size={16} stroke={2} />}
              to="/games"
            >
              Import and Manage Games
            </Button>
          </Stack>
        )}
        <Stack gap="md">
          {viewMode === 'wide' &&
            factoriesIds.map((factoryId, index) => (
              <FactoryWideCard key={factoryId} id={factoryId} index={index} />
            ))}
          {viewMode === 'compact' &&
            factoriesIds.map((factoryId, index) => (
              <FactoryRow key={factoryId} id={factoryId} index={index} />
            ))}
        </Stack>
        {!hasFactories && <Divider mb="lg" />}
        <Group mt="lg" justify="space-between">
          <Group>
            <Button
              onClick={() => useStore.getState().addGameFactory(gameId!)}
              leftSection={<IconPlus size={16} />}
            >
              Add Factory
            </Button>
            <Tooltip
              label="Adds a new factory to the game and opens it in the Calculator"
              position="bottom"
              withArrow
            >
              <Button
                color="cyan"
                onClick={() => {
                  const newFactoryId = v4();
                  useStore.getState().createFactoryWithSolver(gameId!, {
                    id: newFactoryId,
                    inputs: [],
                    outputs: [{ resource: 'Desc_Cement_C', amount: 10 }],
                  });
                  navigate(`/factories/${newFactoryId}/calculator`);
                }}
                leftSection={<IconPlus size={16} />}
                rightSection={<IconCalculator size={16} />}
              >
                Add and Plan Factory
              </Button>
            </Tooltip>

            {/* <FactoryUndoButtons /> */}
          </Group>
          <Group>
            <GameSettingsModal withLabel />
            {/* <SyncButton /> */}
            {/* <Button
              leftSection={<IconTrash size={16} />}
              color="red"
              variant="light"
              onClick={() => {
                dispatch(factoryActions.clear());
                notifications.show({
                  title: 'Factories cleared',
                  message:
                    'All factories have been removed. You can undo this action with Ctrl+Z or using the undo/redo buttons in the command bar.',
                  color: 'blue',
                });
              }}
            >
              Clear All
            </Button> */}
          </Group>
        </Group>
      </Container>
      <Space h={100} />
    </div>
  );
}
