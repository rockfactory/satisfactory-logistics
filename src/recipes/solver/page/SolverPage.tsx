import {
  Box,
  Button,
  Container,
  Group,
  LoadingOverlay,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconTrash,
  IconZoomExclamation,
} from '@tabler/icons-react';
import { Edge, Node, Panel, ReactFlowProvider } from '@xyflow/react';
import Graph from 'graphology';
import { HighsSolution } from 'highs';
import moize from 'moize';
import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RootState } from '../../../core/store';
import { AfterHeaderSticky } from '../../../layout/AfterHeaderSticky';
import { SolverEdge, SolverNode } from '../computeProductionConstraints';
import { IMachineNodeData } from '../layout/MachineNode';
import { IResourceNodeData } from '../layout/ResourceNode';
import { SolverShareButton } from '../share/SolverShareButton';
import { solveProduction, useHighs } from '../solveProduction';
import { SolverLayout } from '../SolverLayout';
import { solverActions, usePathSolverInstance } from '../store/SolverSlice';
import { SolverInputOutputsDrawer } from './SolverInputOutputsDrawer';
import { SolverRecipesDrawer } from './SolverRecipesDrawer';
import { SolverSummaryDrawer } from './summary/SolverSummaryDrawer';

export interface ISolverPageProps {}

export interface ISolverSolution {
  result: HighsSolution;
  nodes: Array<Node<IMachineNodeData | IResourceNodeData>>;
  edges: Edge[];
  graph: Graph<SolverNode, SolverEdge, any>;
}

export function SolverPage(props: ISolverPageProps) {
  const params = useParams<{ id: string }>();

  const factory = useSelector((state: RootState) => {
    return state.factories.present.factories.find(
      factory => factory.id === params.id,
    );
  });

  const { highsRef, loading } = useHighs();
  const dispatch = useDispatch();

  const instance = usePathSolverInstance();
  useEffect(() => {
    dispatch(solverActions.createIfNoCurrent({})); // TODO Remove
    if (factory) {
      dispatch(solverActions.prepareForFactory({ factory }));
    }
    if (params.id && !instance) {
      navigate(`/factories/calculator`);
    }
  }, [instance, factory, params.id]);
  console.log('SolverPage', instance);

  const navigate = useNavigate();
  const current = useSelector(
    (state: RootState) => state.solver.present.current,
  );

  const onChangeSolver = useCallback(
    moize(
      (path: string) =>
        (
          value: string | null | number | React.ChangeEvent<HTMLInputElement>,
        ) => {
          if (typeof value === 'object' && value?.currentTarget) {
            value = value.currentTarget.value;
          }
          dispatch(solverActions.updateAtPath({ id: params.id, path, value }));
        },
      { maxSize: 100 },
    ),
    [dispatch, params.id],
  );

  const solution = useMemo(() => {
    if (!instance?.request || !highsRef.current || loading) return null;

    const solution = solveProduction(highsRef.current, instance?.request);
    console.log(`Solved -> `, solution);
    return solution;
  }, [instance?.request, loading]);

  if (params.id == null && current != null) {
    // TODO/Debug
    navigate(`/factories/calculator/${current}`);
    return;
  }

  const hasSolution =
    solution &&
    solution.result.Status === 'Optimal' &&
    solution?.nodes.length > 0;
  console.log('hasSolution', hasSolution, solution);
  return (
    <Box w="100%" pos="relative">
      <LoadingOverlay visible={loading} />
      {/* <RecipeSolverDemo />
      z */}

      <AfterHeaderSticky>
        <Group gap="sm" justify="space-between">
          <Group gap="sm">
            {factory && (
              <>
                <Button
                  component={Link}
                  to="/factories"
                  variant="outline"
                  color="gray"
                  leftSection={<IconArrowLeft size={16} />}
                >
                  All Factories
                </Button>
                <Title order={4}>{factory.name ?? 'Factory'}</Title>
              </>
            )}
          </Group>
          <Group gap="sm">
            <SolverInputOutputsDrawer onChangeSolver={onChangeSolver} />
            <Select
              data={[
                { value: 'minimize_resources', label: 'Minimize Resources' },
                { value: 'minimize_power', label: 'Minimize Power' },
                { value: 'minimize_area', label: 'Minimize Area' },
                // TODO Centralize defs
              ]}
              placeholder="Objective"
              value={instance?.request?.objective ?? 'minimize_resources'}
              onChange={onChangeSolver('request.objective')}
            />
            <SolverRecipesDrawer />

            <Button
              color="red"
              variant="light"
              onClick={() => {
                dispatch(solverActions.remove({ id: instance!.id }));
                if (factory) {
                  navigate(`/factories`);
                  notifications.show({
                    title: 'Solver removed',
                    message: `Solver for ${factory.name ?? 'factory'} removed`,
                  });
                } else {
                  navigate(`/factories/calculator`);
                  notifications.show({
                    title: 'Solver removed',
                    message: `Solver removed`,
                  });
                }
              }}
              leftSection={<IconTrash size={16} />}
            >
              Reset
            </Button>
          </Group>
        </Group>
      </AfterHeaderSticky>
      {solution && hasSolution && (
        <Stack gap="md">
          <ReactFlowProvider>
            <SolverLayout nodes={solution.nodes} edges={solution.edges}>
              <Panel>
                <Group gap="xs">
                  <SolverSummaryDrawer solution={solution} />
                  <SolverShareButton />
                </Group>
              </Panel>
            </SolverLayout>
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
          </Stack>
        </Container>
      )}
    </Box>
  );
}
