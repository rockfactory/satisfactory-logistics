import {
  Button,
  Container,
  Divider,
  Grid,
  Group,
  SimpleGrid,
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
import { useCallback, useState } from 'react';
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
import { ControlledBoard, KanbanBoard, moveCard } from '@caldwell619/react-kanban';
import { Factory, FactoryProgressStatus } from '@/factories/Factory.ts';
import { useGameFactories } from '@/games/store/gameFactoriesSelectors.ts';
import { ProgressChip } from '@/factories/ProgressChip.tsx';
import './FactoryKanban.css'
import { Path, setByPath } from '@clickbar/dot-diver';
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
  const factories = useGameFactories(gameId);

  const board: KanbanBoard<Factory> = {
    columns: [
      'draft',
      'to_be_done',
      'in_progress',
      'done',
    ].map(status => ({
      id: status,
      title: status,
      cards: factories.filter(it => it.progress === status)
        .sort((a, b) => (a.boardIndex ?? Number.MAX_VALUE) - (b.boardIndex ?? Number.MAX_VALUE))
    }))
  };

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
        {viewMode === 'compact' && (
          <SimpleGrid spacing="lg" cols={3}>
            {factoriesIds.map((factoryId, index) => (
              <FactoryRow key={factoryId} id={factoryId} />
            ))}
          </SimpleGrid>
        )}
        {!hasFactories && <Divider mb="lg" />}
      </Container>

      {viewMode === 'wide' && (
        <ControlledBoard<Factory>
          renderColumnHeader={it => (
            <ProgressChip
              status={it.id as FactoryProgressStatus}
              size="lg"
              variant="light"
            />
          )}
          allowAddCard={false}
          allowAddColumn={false}
          renderCard={({ id }) => (
            <FactoryRow id={id} showProgressStatus={false} />
          )}
          onCardDragEnd={(movedFactory, source, destination) => {
            const { toPosition, toColumnId } = destination!;
            const { fromPosition, fromColumnId } = source!;

            if (fromPosition === undefined || fromColumnId === undefined|| toPosition === undefined|| toColumnId === undefined) {
              throw new Error();
            }

            const newBoard = moveCard(board, source, destination) as KanbanBoard<Factory>;

            const newToColumn = newBoard.columns.find(it => it.id === toColumnId)!
            const newFromColumn = newBoard.columns.find(it => it.id === fromColumnId)!

            return useStore
              .getState()
              .updateFactories(factory => {
                if (factory.id === movedFactory.id) {
                  factory.progress = toColumnId as FactoryProgressStatus;
                }

                if (factory.progress === toColumnId) {
                  factory.boardIndex = newToColumn.cards.findIndex(it => it.id === factory.id);

                  return;
                }

                if (factory.progress === fromColumnId) {
                  factory.boardIndex = newFromColumn.cards.findIndex(it => it.id === factory.id);

                  return;
                }
              });
            }}
        >
          {board}
        </ControlledBoard>
      )}
      <Container size="lg" mt="lg">
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
          </Group>
          <Group>
            <GameSettingsModal withLabel />
          </Group>
        </Group>
      </Container>
      <Space h={100} />
    </div>
  );
}
