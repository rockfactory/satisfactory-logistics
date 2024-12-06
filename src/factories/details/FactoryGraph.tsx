import { useSolverSolution } from '@/solver/page/useSolverSolution.ts';
import { Box } from '@mantine/core';
import { SolverRequestDrawer } from '@/solver/page/request-drawer/SolverRequestDrawer.tsx';
import { SolverSolutionFragment } from '@/solver/page/SolverSolutionFragment.tsx';
import React from 'react';

export const FactoryGraph = ({ id }: { id: string }) => {
  const { suggestions, instance, solution, loading, onChangeHandler } =
    useSolverSolution(id, 'game');

  return (
    <Box h="80vh" pos={'relative'}>
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
    </Box>
  );
};
