import { loglev } from '@/core/logger/log';
import {
  useFactoryInputsOutputs,
  useFactorySimpleAttributes,
} from '@/factories/store/factoriesSelectors';
import { GameSettingsModal } from '@/games/settings/GameSettingsModal';
import { Path, setByPath } from '@clickbar/dot-diver';
import {
  Box,
  Button,
  Container,
  Group,
  LoadingOverlay,
  Space,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconPlus,
  IconZoomExclamation,
} from '@tabler/icons-react';
import { Edge, Panel, ReactFlowProvider } from '@xyflow/react';
import Graph from 'graphology';
import { HighsSolution } from 'highs';
import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { v4 } from 'uuid';
import { useFormOnChange } from '@/core/form/useFormOnChange';
import { useStore } from '@/core/zustand';
import { AfterHeaderSticky } from '@/layout/AfterHeaderSticky';
import { isSolutionFound } from '@/solver/algorithm/solve/isSolutionFound';
import {
  solveProduction,
  useHighs,
  type SolutionNode,
} from '@/solver/algorithm/solveProduction';
import type { SolverContext } from '@/solver/algorithm/SolverContext';
import type { SolverEdge, SolverNode } from '@/solver/algorithm/SolverNode';
import { SolverInspectorDrawer } from '@/solver/inspector/SolverInspectorDrawer';
import { SolverSolutionProvider } from '@/solver/layout/solution-context/SolverSolutionContext';
import { SolverLayout } from '@/solver/layout/SolverLayout';
import { SolverShareButton } from '@/solver/share/SolverShareButton';
import { SolverInstance } from '@/solver/store/Solver';
import {
  getSolverGame,
  useCurrentSolverId,
  usePathSolverInstance,
  useSolverGameId,
} from '@/solver/store/solverSelectors';
import { SolverRequestDrawer } from './request-drawer/SolverRequestDrawer';
import { SolverResetButton } from './SolverResetButton';
import {
  proposeSolverSolutionSuggestions,
  type ISolverSolutionSuggestion,
} from './suggestions/proposeSolverSolutionSuggestions';
import { SolverSuggestions } from './suggestions/SolverSuggestions';
import { SolverSummaryDrawer } from './summary/SolverSummaryDrawer';

const logger = loglev.getLogger('solver:page');

export interface ISolverPageProps {}

// TODO Move in dedicated file
export interface ISolverSolution {
  result: HighsSolution;
  nodes: SolutionNode[];
  edges: Edge[];
  graph: Graph<SolverNode, SolverEdge, any>;
  context: SolverContext;
}

export function SolverPage(props: ISolverPageProps) {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { highsRef, loading } = useHighs();
  const navigate = useNavigate();

  const factory = useFactorySimpleAttributes(id);
  const inputsOutputs = useFactoryInputsOutputs(id);
  const instance = usePathSolverInstance();
  // This is not the _displayed_ solver ID, but the one that is to be used if no solver ID is provided
  const currentSolverId = useCurrentSolverId();
  const solverGameId = useSolverGameId(id);

  useEffect(() => {
    if (!params.id) return;
    if (instance && factory) return;

    logger.log('SolverPage: No instance or factory, creating', id);
    useStore.getState().upsertFactorySolver(id, {
      inputs: [],
      outputs: [
        {
          resource: 'Desc_Cement_C',
          amount: 20,
        },
      ],
    });
  }, [instance, factory, id, params.id, navigate]);

  logger.log('SolverPage', instance, id);

  const updater = useMemo(
    () => (path: Path<SolverInstance>, value: string | null | number) => {
      useStore.getState().updateSolver(id!, state => {
        setByPath(state, path, value);
      });
    },
    [id],
  );

  const onChangeHandler = useFormOnChange<SolverInstance>(updater);

  const { solution, suggestions } = useMemo(() => {
    let suggestions: ISolverSolutionSuggestion = {};
    if (!instance?.request || !highsRef.current || loading) {
      return {
        solution: null,
        suggestions,
      };
    }

    const solution = solveProduction(highsRef.current, {
      ...instance?.request,
      ...inputsOutputs,
      nodes: instance.nodes,
    });
    logger.log(`Solved -> `, solution);

    if (solution && !isSolutionFound(solution)) {
      suggestions = proposeSolverSolutionSuggestions(
        highsRef.current,
        instance.request,
        inputsOutputs,
      );
    }

    return { solution, suggestions };
    // We don't want to re-run computation if instance changes, only if its request changes
  }, [highsRef, instance?.request, instance?.nodes, inputsOutputs, loading]);

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

  const hasSolution = isSolutionFound(solution);

  logger.log('hasSolution =', hasSolution);

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
      {solution && hasSolution && (
        <Stack gap="md">
          <ReactFlowProvider>
            <SolverSolutionProvider solution={solution}>
              <SolverLayout nodes={solution.nodes} edges={solution.edges}>
                <Panel>
                  <Group gap="xs">
                    <SolverSummaryDrawer solution={solution} />
                    <SolverShareButton />
                    {import.meta.env.DEV && (
                      <SolverInspectorDrawer solution={solution} />
                    )}
                  </Group>
                </Panel>
              </SolverLayout>
            </SolverSolutionProvider>
          </ReactFlowProvider>
        </Stack>
      )}
      {!hasSolution && (
        <Container size="lg" mt="lg">
          <Stack gap="xs" align="center" mih={200} mt={60} mb={90}>
            <IconZoomExclamation size={64} stroke={1.2} />
            <Text fz="h2">No results found</Text>
            <Text size="sm" c="dark.2">
              No solution found for the given parameters. Try adjusting the
              inputs, outputs and available recipes.
            </Text>
            <Space />
            <SolverSuggestions suggestions={suggestions} instance={instance} />
          </Stack>
        </Container>
      )}
    </Box>
  );
}
