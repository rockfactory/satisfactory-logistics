import type { ISolverSolutionSuggestion } from '@/solver/page/suggestions/proposeSolverSolutionSuggestions';
import { ISolverSolution } from '@/solver/page/ISolverSolution';
import { isSolutionFound } from '@/solver/algorithm/solve/isSolutionFound';
import { Container, Group, Space, Stack, Text } from '@mantine/core';
import { Panel, ReactFlowProvider } from '@xyflow/react';
import { SolverSolutionProvider } from '@/solver/layout/solution-context/SolverSolutionContext';
import { SolverLayout } from '@/solver/layout/SolverLayout';
import { SolverSummaryDrawer } from '@/solver/page/summary/SolverSummaryDrawer';
import { SolverShareButton } from '@/solver/share/SolverShareButton';
import { SolverLayoutButtons } from '@/solver/layout/state/SolverLayoutButtons';
import { SolverInspectorDrawer } from '@/solver/inspector/SolverInspectorDrawer';
import { IconZoomExclamation } from '@tabler/icons-react';
import { SolverSuggestions } from '@/solver/page/suggestions/SolverSuggestions';
import { SolverInstance } from '@/solver/store/Solver';

export const SolverSolutionFragment = ({
  solution,
  suggestions,
  instance,
  solverId,
}: {
  suggestions: ISolverSolutionSuggestion;
  solution: ISolverSolution;
  instance: SolverInstance;
  solverId: string;
}) => {
  const hasSolution = isSolutionFound(solution);

  return (
    <>
      {solution && hasSolution && (
        <ReactFlowProvider>
          <SolverSolutionProvider solution={solution}>
            <SolverLayout
              nodes={solution.nodes}
              edges={solution.edges}
              id={solverId}
            >
              <Panel>
                <Group gap="xs">
                  <SolverSummaryDrawer solution={solution} id={solverId} />
                  <SolverShareButton id={solverId} />
                  <SolverLayoutButtons
                    solution={solution}
                    solverId={solverId}
                  />
                  {import.meta.env.DEV && (
                    <SolverInspectorDrawer solution={solution} />
                  )}
                </Group>
              </Panel>
            </SolverLayout>
          </SolverSolutionProvider>
        </ReactFlowProvider>
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
            <SolverSuggestions suggestions={suggestions} instance={instance!} />
          </Stack>
        </Container>
      )}
    </>
  );
};
