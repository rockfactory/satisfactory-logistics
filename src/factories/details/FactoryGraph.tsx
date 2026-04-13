import { Box, Button, Container, Stack, Text } from '@mantine/core';
import { IconArrowLeft, IconListDetails } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { FactoryContext } from '@/FactoryContext';
import { useFactoryInputsOutputs } from '@/factories/store/factoriesSelectors';
import { SolverRequestDrawer } from '@/solver/page/request-drawer/SolverRequestDrawer';
import { SolverSolutionFragment } from '@/solver/page/SolverSolutionFragment';
import { useSolverSolution } from '@/solver/page/useSolverSolution';

export const FactoryGraph = ({ id }: { id: string }) => {
  const { suggestions, instance, solution, loading, onChangeHandler } =
    useSolverSolution(id, 'game');
  const { outputs } = useFactoryInputsOutputs(id);
  const hasConfiguredOutputs = outputs?.some(o => o.resource != null);

  return (
    <FactoryContext.Provider value={id}>
      <Box pos={'absolute'} right={0} top={0} style={{ zIndex: 99 }} p="md">
        <SolverRequestDrawer
          factoryId={id}
          solution={solution}
          onSolverChangeHandler={onChangeHandler}
        />
      </Box>
      {!loading && instance && hasConfiguredOutputs && (
        <SolverSolutionFragment
          solverId={id}
          suggestions={suggestions}
          solution={solution!}
          instance={instance}
        />
      )}
      {!loading && !hasConfiguredOutputs && (
        <Container size="lg" mt="lg">
          <Stack gap="xs" align="center" mih={200} mt={60} mb={90}>
            <IconListDetails size={64} stroke={1.2} />
            <Text fz="h2">No outputs configured</Text>
            <Text size="sm" c="dark.2">
              Add at least one output in the Overview to start planning your
              production chain.
            </Text>
            <Button
              component={Link}
              to={`/factories/${id}`}
              mt="md"
              size="md"
              leftSection={<IconArrowLeft size={16} />}
              variant="light"
            >
              Go to Overview
            </Button>
          </Stack>
        </Container>
      )}
    </FactoryContext.Provider>
  );
};
