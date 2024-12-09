import { useStore } from '@/core/zustand';
import { Divider, Group, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconConfetti } from '@tabler/icons-react';
import confetti from 'canvas-confetti';
import { difference } from 'lodash';
import { ISolverSolution } from '@/solver/page/ISolverSolution';

export function showConfettiWhenFactoryBuilt(
  solution: ISolverSolution,
  factoryId: string,
) {
  const buildableNodeIds = solution.nodes
    .filter(n => n.type === 'Machine')
    .map(n => n.id);

  const builtNodeIds = Object.entries(
    useStore.getState().solvers.instances[factoryId ?? '']?.nodes ?? {},
  )
    .filter(([id, node]) => node.done)
    .map(([id]) => id);

  // Still some nodes to build
  if (
    builtNodeIds.length === 0 ||
    buildableNodeIds.length === 0 ||
    difference(buildableNodeIds, builtNodeIds).length > 0
  )
    return;

  // All nodes are built!
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    zIndex: 2000,
  })?.catch(() => {});

  modals.openConfirmModal({
    title: (
      <Group>
        <IconConfetti />
        You did it!
      </Group>
    ),
    children: (
      <Stack gap="xs">
        <Text size="sm">
          Congratulations, you have <b>built all the machines</b> in this
          factory: your work here is complete.{' '}
          <em>At least, for now. Enjoy a well-deserved two-minute break.</em>
        </Text>
        <Divider />
        <Text size="sm">
          Would you like to reset the build markers? This will only remove the
          green background and the check icon, making the <b>diagram cleaner</b>
          .
        </Text>
      </Stack>
    ),
    labels: {
      confirm: 'Yes, reset the markers',
      cancel: 'Leave it as it is',
    },
    confirmProps: {
      color: 'green',
    },
    onConfirm: () => {
      useStore.getState().resetSolverBuiltMarkers(factoryId);
    },
  });
}
