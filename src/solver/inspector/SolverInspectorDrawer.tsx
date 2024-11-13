import { Button, Drawer } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPick } from '@tabler/icons-react';
import type { ISolverSolution } from '@/solver/page/SolverPage';

export interface ISolverInspectorDrawerProps {
  solution: ISolverSolution | null;
}

export function SolverInspectorDrawer(props: ISolverInspectorDrawerProps) {
  const { solution } = props;
  const [isOpen, { open, close }] = useDisclosure();

  if (!solution) {
    return null;
  }

  return (
    <div>
      <Button
        leftSection={<IconPick />}
        onClick={open}
        variant="subtle"
        color="teal"
      >
        Inspect
      </Button>

      <Drawer opened={isOpen} onClose={close} title="Solver Inspector">
        <pre>{solution.context.formulateProblem()}</pre>
      </Drawer>
    </div>
  );
}
