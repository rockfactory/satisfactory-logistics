import { Button, Container, Group, Space, Stack, Text } from '@mantine/core';
import {
  IconArrowsDiff,
  IconListDetails,
  IconZoomExclamation,
} from '@tabler/icons-react';
import { Panel, ReactFlowProvider } from '@xyflow/react';
import { useFactoryContext } from '@/FactoryContext';
import { useFactoryInputsOutputs } from '@/factories/store/factoriesSelectors';
import { isSolutionFound } from '@/solver/algorithm/solve/isSolutionFound';
import { SolverInspectorDrawer } from '@/solver/inspector/SolverInspectorDrawer';
import { SolverHighlightProvider } from '@/solver/layout/highlight/SolverHighlightContext';
import { SolverLayout } from '@/solver/layout/SolverLayout';
import { SolverSolutionProvider } from '@/solver/layout/solution-context/SolverSolutionContext';
import { SolverLayoutButtons } from '@/solver/layout/state/SolverLayoutButtons';
import type { ISolverSolution } from '@/solver/page/ISolverSolution';
import type { ISolverSolutionSuggestion } from '@/solver/page/suggestions/proposeSolverSolutionSuggestions';
import { SolverSuggestions } from '@/solver/page/suggestions/SolverSuggestions';
import { SolverSummaryDrawer } from '@/solver/page/summary/SolverSummaryDrawer';
import { SolverShareButton } from '@/solver/share/SolverShareButton';
import type { SolverInstance } from '@/solver/store/Solver';

export const SolverSolutionFragment = ({
  solution,
  suggestions,
  instance,
  solverId,
  onOpenInputsOutputs,
}: {
  suggestions: ISolverSolutionSuggestion;
  solution: ISolverSolution;
  instance: SolverInstance;
  solverId: string;
  onOpenInputsOutputs?: () => void;
}) => {
  const hasSolution = isSolutionFound(solution);
  const factoryId = useFactoryContext();
  const { outputs } = useFactoryInputsOutputs(factoryId);
  const hasOutputsWithAmount = outputs?.some(
    o => o.resource != null && o.amount != null && o.amount > 0,
  );

  return (
    <>
      {solution && hasSolution && (
        <ReactFlowProvider>
          <SolverSolutionProvider solution={solution}>
            <SolverHighlightProvider>
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
            </SolverHighlightProvider>
          </SolverSolutionProvider>
        </ReactFlowProvider>
      )}
      {!hasSolution && !hasOutputsWithAmount && (
        <Container size="lg" mt="lg">
          <Stack gap="xs" align="center" mih={200} mt={60} mb={90}>
            <IconListDetails size={64} stroke={1.2} />
            <Text fz="h2">No outputs configured</Text>
            <Text size="sm" c="dark.2">
              Set an amount greater than 0 for at least one output to start
              computing the production chain.
            </Text>
            {onOpenInputsOutputs && (
              <Button
                mt="md"
                size="md"
                variant="light"
                leftSection={<IconArrowsDiff size={16} />}
                onClick={onOpenInputsOutputs}
              >
                Inputs/Outputs
              </Button>
            )}
          </Stack>
        </Container>
      )}
      {!hasSolution && hasOutputsWithAmount && (
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
