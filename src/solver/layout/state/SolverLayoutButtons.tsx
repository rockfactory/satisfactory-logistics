import { loglev } from '@/core/logger/log';
import { useStore } from '@/core/zustand';
import { SolutionNode } from '@/solver/algorithm/solveProduction';
import type { ISolverSolution } from '@/solver/page/SolverPage';
import { usePathSolverInstance } from '@/solver/store/solverSelectors';
import { Button } from '@mantine/core';
import { IconLayout } from '@tabler/icons-react';
import { useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';

export interface ISolverLayoutButtonsProps {
  solution: ISolverSolution;
}

const logger = loglev.getLogger('solver:layout-buttons');
logger.setLevel('debug');

/**
 * Shows buttons for solver layout management.
 */
export function SolverLayoutButtons(props: ISolverLayoutButtonsProps) {
  const { solution } = props;

  const { id: solverId } = usePathSolverInstance();
  const { setNodes } = useReactFlow<SolutionNode>();

  const handleReset = useCallback(() => {
    logger.info('User requesting layout reset');
    useStore.getState().resetSolverLayout(solverId);
    setNodes(prevNodes => [...prevNodes]);
  }, [setNodes, solverId]);

  return (
    <Button
      variant="filled"
      onClick={handleReset}
      color="gray"
      leftSection={<IconLayout size={16} />}
    >
      Reset layout
    </Button>
  );
}
