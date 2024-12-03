import { loglev } from '@/core/logger/log';
import { useStore } from '@/core/zustand';
import { GameSettingsModal } from '@/games/settings/GameSettingsModal';
import { AfterHeaderSticky } from '@/layout/AfterHeaderSticky';
import { getSolverGame } from '@/solver/store/solverSelectors';
import {
  Box,
  Button,
  Group,
  LoadingOverlay,
  TextInput,
  Title,
} from '@mantine/core';
import { IconArrowLeft, IconPlus } from '@tabler/icons-react';
import { HighsSolution } from 'highs';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { v4 } from 'uuid';
import { SolverRequestDrawer } from './request-drawer/SolverRequestDrawer';
import { SolverResetButton } from './SolverResetButton';
import { useSolverSolution } from '@/solver/page/useSolverSolution.ts';
import { SolverSolutionFragment } from '@/solver/page/SolverSolutionFragment.tsx';

const logger = loglev.getLogger('solver:page');

export interface ISolverPageProps {}

export function SolverPage(props: ISolverPageProps) {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const navigate = useNavigate();

  const {
    loading,
    factory,
    currentSolverId,
    solverGameId,
    onChangeHandler,
    solution,
    suggestions,
    instance,
  } = useSolverSolution(id);

  if (params.id == null) {
    const hasCurrentSolverGame = getSolverGame(
      useStore.getState(),
      currentSolverId ?? '',
    );
    if (!currentSolverId || hasCurrentSolverGame) {
      logger.log('No solver ID, creating');
      const newSolverId = v4();
      useStore.getState().setCurrentSolver(newSolverId);
      navigate(`/factories/${v4()}/calculator`);
    } else {
      logger.log('No solver ID, redirecting to', currentSolverId);
      navigate(`/factories/${currentSolverId}/calculator`);
    }
  }

  return (
    <Box w="100%" pos="relative">
      <LoadingOverlay visible={loading} />

      <AfterHeaderSticky>
        <Group gap="sm" justify="space-between">
          <Group gap="sm">
            {solverGameId && (
              <>
                <Button
                  component={Link}
                  to="/factories"
                  variant="light"
                  color="gray"
                  leftSection={<IconArrowLeft size={16} />}
                >
                  All Factories
                </Button>
              </>
            )}
            <Title order={4}>
              <TextInput
                value={factory?.name ?? 'Solver'}
                placeholder="Factory Name"
                onChange={e => {
                  useStore
                    .getState()
                    .updateFactory(
                      factory.id,
                      f => (f.name = e.currentTarget.value),
                    );
                }}
              />
            </Title>
            {!solverGameId && id && (
              <Button
                variant="filled"
                onClick={() => {
                  useStore.getState().addFactoryIdToGame(undefined, id);
                }}
                leftSection={<IconPlus size={16} />}
              >
                Add to Game
              </Button>
            )}
            <SolverResetButton id={id} factory={factory} />
          </Group>
          <Group gap="sm">
            <SolverRequestDrawer
              solution={solution}
              onSolverChangeHandler={onChangeHandler}
            />

            <GameSettingsModal />
          </Group>
        </Group>
      </AfterHeaderSticky>
      <SolverSolutionFragment
        suggestions={suggestions}
        solution={solution!}
        instance={instance}
      />
    </Box>
  );
}
