import type { FormOnChangeHandler } from '@/core/form/useFormOnChange';
import type { SolverInstance } from '@/solver/store/Solver';
import { Button, Center, Drawer, em, Stack, Tabs } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconArrowsDiff,
  IconBarrierBlock,
  IconNoDerivatives,
  IconTestPipe,
  IconX,
} from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ISolverSolution } from '../SolverPage';
import { SolverInputOutputsDrawer } from './SolverInputOutputsDrawer';
import { SolverLimitationsDrawer } from './SolverLimitationsDrawer';
import { SolverRecipesDrawer } from './SolverRecipesDrawer';
import classes from './SolverRequestDrawer.module.css';
import { Notepad } from '@/notepad/Notepad.tsx';

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
  {
    value: 'notes',
    label: 'Notes',
    icon: <IconNoDerivatives size={16} />,
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

  const isMobile = useMediaQuery(`(max-width: ${em(750)})`);

  return (
    <>
      <Button.Group orientation={isMobile ? 'vertical' : 'horizontal'}>
        {SolverRequestTabs.map(({ value, label, icon }) => (
          <Button
            key={value}
            // variant="light"
            color="blue"
            size="sm"
            className={classes.openButton}
            leftSection={icon}
            onClick={() => setTab(value)}
          >
            {label}
          </Button>
        ))}
      </Button.Group>
      <Drawer.Root
        position="right"
        size={'xl'}
        opened={tab !== null}
        onClose={close}
        classNames={{
          header: classes.header,
          title: classes.title,
          content: classes.content,
          body: classes.body,
        }}
        // Allow navigation away from the drawer
        closeOnClickOutside={false}
        trapFocus={false}
        lockScroll={false}
      >
        <Drawer.Content>
          <Drawer.Header>
            <Button
              variant="unstyled"
              onClick={close}
              className={classes.closeBanner}
              justify="space-between"
              rightSection={<IconX size={16} />}
            >
              Close
            </Button>
            <Drawer.Title>
              <Stack align="flex-start" gap="xs">
                <Tabs
                  variant="unstyled"
                  value={tab}
                  onChange={value => setTab(value as any)}
                  classNames={{
                    tab: classes.tab,
                    root: classes.tabsListRoot,
                  }}
                >
                  <Tabs.List>
                    {SolverRequestTabs.map(({ value, label, icon }) => (
                      <Tabs.Tab key={value} value={value}>
                        <Center style={{ gap: 10 }}>
                          {icon}
                          {label}
                        </Center>
                      </Tabs.Tab>
                    ))}
                  </Tabs.List>
                </Tabs>
                <div id="solver-request-drawer_title" />
              </Stack>
            </Drawer.Title>
          </Drawer.Header>
          <Drawer.Body>
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
              <Tabs.Panel value="notes">
                <Notepad adaQuotes={true} />
              </Tabs.Panel>
            </Tabs>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Root>
    </>
  );
}
