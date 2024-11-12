import { loglev } from '@/core/logger/log';
import { useStore } from '@/core/zustand';
import { SolutionNode } from '@/solver/algorithm/solveProduction';
import type { ISolverSolution } from '@/solver/page/SolverPage';
import { usePathSolverInstance } from '@/solver/store/solverSelectors';
import { Button } from '@mantine/core';
import { IconLayout } from '@tabler/icons-react';
import { useNodes, useReactFlow, type Node } from '@xyflow/react';
import { isEqual } from 'lodash';
import diff from 'microdiff';
import { useCallback, useEffect, useMemo } from 'react';
import { areSavedLayoutsCompatible } from './isSavedLayoutValid';

export interface ISolverLayoutSaveButtonProps {
  solution: ISolverSolution;
}

const logger = loglev.getLogger('solver:layout-state');
logger.setLevel('debug');

function computeLayout(nodes: Node[]) {
  return Object.fromEntries(
    nodes.map(node => [node.id, { x: node.position.x, y: node.position.y }]),
  );
}

export function SolverLayoutSaveButton(props: ISolverLayoutSaveButtonProps) {
  const { solution } = props;

  const { id: solverId, layout } = usePathSolverInstance();
  const { getNodes } = useReactFlow<SolutionNode>();

  const nodes = useNodes<SolutionNode>();

  const hasLayoutChanges = useMemo(() => {
    const equals = isEqual(computeLayout(nodes), layout);
    if (!equals) {
      logger.log(
        'Layout has changes',
        diff(computeLayout(nodes), layout ?? {}),
      );
    }
    return !equals;
  }, [nodes, layout]);

  useEffect(() => {
    const computedLayout = computeLayout(nodes);
    if (!isEqual(computedLayout, layout)) {
      if (areSavedLayoutsCompatible(computedLayout, layout)) {
        logger.log('Layout has changed: Updating layout (compatible)');
        useStore.getState().setSolverLayout(solverId, computedLayout);
      } else {
        logger.log('Layout has changed: Not compatible with saved layout');
      }
    }
  }, [nodes, solverId]);

  const handleSave = useCallback(() => {
    const nodes = getNodes();
    const layout = Object.fromEntries(
      nodes.map(node => [node.id, { x: node.position.x, y: node.position.y }]),
    );

    logger.log('Saving layout', layout);
    useStore.getState().setSolverLayout(solverId, layout);
  }, [getNodes, solverId]);

  return (
    <Button
      variant="filled"
      onClick={handleSave}
      color="blue"
      disabled={!hasLayoutChanges}
      leftSection={<IconLayout size={16} />}
    >
      Save layout
    </Button>
  );
}
