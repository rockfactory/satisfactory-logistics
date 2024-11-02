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
import { IconArrowsDiff, IconTestPipe } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ISolverSolution } from '../SolverPage';
import { SolverInputOutputsDrawer } from './SolverInputOutputsDrawer';
import { SolverRecipesDrawer } from './SolverRecipesDrawer';

export interface ISolverRequestDrawerProps {
  solution: ISolverSolution | null;
  onSolverChangeHandler: FormOnChangeHandler<SolverInstance>;
}

/**
 * Drawer and buttons to configure the request to the solver.
 */
export function SolverRequestDrawer(props: ISolverRequestDrawerProps) {
  const id = useParams<{ id: string }>().id;
  const { solution, onSolverChangeHandler } = props;

  const [tab, setTab] = useState<'inputs-outputs' | 'recipes' | null>(null);
  const close = useCallback(() => setTab(null), [setTab]);

  return (
    <>
      <Button.Group>
        <Button
          variant="light"
          color="blue"
          size="sm"
          leftSection={<IconArrowsDiff size={16} />}
          onClick={() => setTab('inputs-outputs')}
        >
          Inputs/Outputs
        </Button>
        <Button
          variant="light"
          color="blue"
          size="sm"
          leftSection={<IconTestPipe size={16} />}
          onClick={() => setTab('recipes')}
        >
          Recipes
        </Button>
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
              data={[
                {
                  value: 'inputs-outputs',
                  label: (
                    <Center style={{ gap: 10 }}>
                      <IconArrowsDiff size={16} />
                      Inputs/Outputs
                    </Center>
                  ),
                },
                {
                  value: 'recipes',
                  label: (
                    <Center style={{ gap: 10 }}>
                      <IconTestPipe size={16} />
                      Recipes
                    </Center>
                  ),
                },
              ]}
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
        </Tabs>
      </Drawer>
    </>
  );
}
