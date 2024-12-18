import { useSolverSolution } from '@/solver/page/useSolverSolution';
import { Box } from '@mantine/core';
import { SolverRequestDrawer } from '@/solver/page/request-drawer/SolverRequestDrawer';
import { SolverSolutionFragment } from '@/solver/page/SolverSolutionFragment';

export const FactoryGraph = ({ id }: { id: string }) => {
  const { suggestions, instance, solution, loading, onChangeHandler } =
    useSolverSolution(id, 'game');

  return (
    <>
      <Box pos={'absolute'} right={0} top={0} style={{ zIndex: 99 }} p="md">
        <SolverRequestDrawer
          factoryId={id}
          solution={solution}
          onSolverChangeHandler={onChangeHandler}
        />
      </Box>
      {!loading && instance && (
        <SolverSolutionFragment
          solverId={id}
          suggestions={suggestions}
          solution={solution!}
          instance={instance}
        />
      )}
    </>
  );
};
