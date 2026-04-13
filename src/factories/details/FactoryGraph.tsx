import { Box } from '@mantine/core';
import { useCallback, useState } from 'react';
import { FactoryContext } from '@/FactoryContext';
import {
  SolverRequestDrawer,
  type SolverRequestTab,
} from '@/solver/page/request-drawer/SolverRequestDrawer';
import { SolverSolutionFragment } from '@/solver/page/SolverSolutionFragment';
import { useSolverSolution } from '@/solver/page/useSolverSolution';

export const FactoryGraph = ({ id }: { id: string }) => {
  const { suggestions, instance, solution, loading, onChangeHandler } =
    useSolverSolution(id, 'game');
  const [drawerTab, setDrawerTab] = useState<SolverRequestTab>(null);
  const openInputsOutputs = useCallback(
    () => setDrawerTab('inputs-outputs'),
    [],
  );

  return (
    <FactoryContext.Provider value={id}>
      <Box pos={'absolute'} right={0} top={0} style={{ zIndex: 99 }} p="md">
        <SolverRequestDrawer
          factoryId={id}
          solution={solution}
          onSolverChangeHandler={onChangeHandler}
          tab={drawerTab}
          onTabChange={setDrawerTab}
        />
      </Box>
      {!loading && instance && (
        <SolverSolutionFragment
          solverId={id}
          suggestions={suggestions}
          solution={solution!}
          instance={instance}
          onOpenInputsOutputs={openInputsOutputs}
        />
      )}
    </FactoryContext.Provider>
  );
};
