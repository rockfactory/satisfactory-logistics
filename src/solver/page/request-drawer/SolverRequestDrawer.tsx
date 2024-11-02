import type { FormOnChangeHandler } from '@/core/form/useFormOnChange';
import type { SolverInstance } from '@/solver/store/Solver';
import {
  Button,
  Center,
  Drawer,
  SegmentedControl,
  Stack,
  Tabs,
} from '@mantine/core';
import {
  IconArrowsDiff,
  IconBarrierBlock,
  IconTestPipe,
} from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ISolverSolution } from '../SolverPage';
import { SolverInputOutputsDrawer } from './SolverInputOutputsDrawer';
import { SolverLimitationsDrawer } from './SolverLimitationsDrawer';
import { SolverRecipesDrawer } from './SolverRecipesDrawer';

export interface ISolverRequestDrawerProps {
  solution: ISolverSolution | null;
  onSolverChangeHandler: FormOnChangeHandler<SolverInstance>;
}

const SolverRequestTabs = [
  {
    value: 'inputs-outputs',
    label: 'Inputs/Outputs',
    icon: <IconArrowsDiff size={16} />,
  },
  { value: 'recipes', label: 'Recipes', icon: <IconTestPipe size={16} /> },
  {
    value: 'limitations',
    label: 'Limitations',
    icon: <IconBarrierBlock size={16} />,
  },
] as const;

/**
 * Drawer and buttons to configure the request to the solver.
 */
export function SolverRequestDrawer(props: ISolverRequestDrawerProps) {
  const id = useParams<{ id: string }>().id;
  const { solution, onSolverChangeHandler } = props;

  const [tab, setTab] = useState<
    'inputs-outputs' | 'recipes' | 'limitations' | null
  >(null);
  const close = useCallback(() => setTab(null), [setTab]);

  return (
    <>
      <Button.Group>
        {SolverRequestTabs.map(({ value, label, icon }) => (
          <Button
            key={value}
            variant="light"
            color="blue"
            size="sm"
            leftSection={icon}
            onClick={() => setTab(value)}
          >
            {label}
          </Button>
        ))}
      </Button.Group>
      <Drawer
        position="right"
        size={tab === 'recipes' ? 'md' : 'xl'}
        opened={tab !== null}
        onClose={close}
        title={
          <Stack align="flex-start">
            <SegmentedControl
              size="md"
              data={SolverRequestTabs.map(({ value, label, icon }) => ({
                value,
                label: (
                  <Center style={{ gap: 10 }}>
                    {icon}
                    {label}
                  </Center>
                ),
              }))}
              value={tab ?? undefined}
              onChange={value => setTab(value as any)}
            />
            <div id="solver-request-drawer_title" />
          </Stack>
        }
        styles={{
          content: {
            boxShadow: 'rgb(29 29 29) -4px 0px 4px -3px',
          },
        }}
        // Allow navigation away from the drawer
        closeOnClickOutside={false}
        withOverlay={false}
        trapFocus={false}
        lockScroll={false}
      >
        <Tabs
          keepMounted={false}
          value={tab}
          onChange={value => setTab(value as any)}
        >
          <Tabs.Panel value="recipes">
            <SolverRecipesDrawer />
          </Tabs.Panel>
          <Tabs.Panel value="inputs-outputs">
            <SolverInputOutputsDrawer
              id={id}
              solution={solution}
              onSolverChangeHandler={onSolverChangeHandler}
            />
          </Tabs.Panel>
          <Tabs.Panel value="limitations">
            <SolverLimitationsDrawer
              id={id}
              onSolverChangeHandler={onSolverChangeHandler}
            />
          </Tabs.Panel>
        </Tabs>
      </Drawer>
    </>
  );
}
