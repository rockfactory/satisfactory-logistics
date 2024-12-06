import { loglev } from '@/core/logger/log';
import { useStore } from '@/core/zustand';
import { GameSettingsModal } from '@/games/settings/GameSettingsModal';
import { AfterHeaderSticky } from '@/layout/AfterHeaderSticky';
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
import { Link, useNavigate } from 'react-router-dom';
import { v4 } from 'uuid';
import { SolverRequestDrawer } from './request-drawer/SolverRequestDrawer';
import { SolverResetButton } from './SolverResetButton';
import { useSolverSolution } from '@/solver/page/useSolverSolution.ts';
import { SolverSolutionFragment } from '@/solver/page/SolverSolutionFragment.tsx';
import { useFactorySimpleAttributes } from '@/factories/store/factoriesSelectors.ts';

const logger = loglev.getLogger('solver:page');

export interface ISolverPageProps {}

export function SolverPage(props: ISolverPageProps) {
  const navigate = useNavigate();
  let currentSolverId = useStore.getState().solvers.current;

  if (!currentSolverId) {
    logger.log('No solver ID, creating');
    const newSolverId = v4();

    useStore.getState().setCurrentSolver(newSolverId);

    currentSolverId = newSolverId;
  }
  const factory = useFactorySimpleAttributes(currentSolverId);

  const {
    loading,
    solverGameId,
    onChangeHandler,
    solution,
    suggestions,
    instance,
  } = useSolverSolution(currentSolverId, 'standalone');

  return (
    <Box w="100%" pos="relative">
      <LoadingOverlay visible={loading || !instance} />

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
                value={factory.name}
                placeholder="Factory Name"
                onChange={e => {
                  useStore
                    .getState()
                    .updateFactory(
                      currentSolverId,
                      f => (f.name = e.currentTarget.value),
                    );
                }}
              />
            </Title>
            {!solverGameId && (
              <Button
                variant="filled"
                onClick={() => {
                  useStore
                    .getState()
                    .addFactoryIdToGame(undefined, currentSolverId);

                  useStore.getState().setCurrentSolver(null);

                  navigate(`/factories/${currentSolverId}/calculator`);
                }}
                leftSection={<IconPlus size={16} />}
              >
                Add to Game
              </Button>
            )}
            <SolverResetButton id={currentSolverId} factory={factory} />
          </Group>
          <Group gap="sm">
            <SolverRequestDrawer
              factoryId={currentSolverId}
              solution={solution}
              onSolverChangeHandler={onChangeHandler}
            />

            <GameSettingsModal />
          </Group>
        </Group>
      </AfterHeaderSticky>
      {instance && (
        <SolverSolutionFragment
          solverId={currentSolverId}
          suggestions={suggestions}
          solution={solution!}
          instance={instance}
        />
      )}
    </Box>
  );
}
