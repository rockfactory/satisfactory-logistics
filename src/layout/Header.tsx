import { Badge, Burger, Container, Group, Image, Tabs } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBuildingFactory,
  IconCalculator,
  IconChartBar,
  IconPackages,
  IconTools,
} from '@tabler/icons-react';
import { capitalize } from 'lodash';
import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserMenu } from '@/auth/UserMenu';
import { useStore } from '@/core/zustand';
import { GameMenu } from '@/games/menu/GameMenu';
import { GameSettingsModal } from '@/games/settings/GameSettingsModal';
import { NotesPanelTrigger } from '@/notes/NotesPanelTrigger';
import { TutorialMenu } from '@/tutorial/TutorialMenu';
import classes from './Header.module.css';
import { HeaderMobileDrawer } from './HeaderMobileDrawer';

const TABS = ['factories', 'charts', 'calculator', 'tools', 'codex'] as const;

type HeaderTab = (typeof TABS)[number];

export const TAB_ROUTES: Record<HeaderTab, string> = {
  factories: '/factories',
  charts: '/factories/charts',
  calculator: '/factories/calculator',
  tools: '/tools',
  codex: '/codex',
};

export const TAB_ICONS: Record<HeaderTab, ReactNode> = {
  factories: <IconBuildingFactory size={16} />,
  charts: <IconChartBar size={16} />,
  calculator: <IconCalculator size={16} />,
  tools: <IconTools size={16} />,
  codex: <IconPackages size={16} />,
};

export function resolveActiveTab(pathname: string): HeaderTab | null {
  if (pathname.startsWith('/tools')) return 'tools';
  if (pathname.startsWith('/codex')) return 'codex';
  if (pathname.startsWith('/factories/charts')) return 'charts';
  if (pathname.startsWith('/factories/calculator')) return 'calculator';
  if (pathname.startsWith('/factories')) return 'factories';
  return null;
}

export function Header() {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const hasSelectedGame = useStore(state => state.games.selected !== null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activeTab = resolveActiveTab(pathname);

  return (
    <header className={classes.header}>
      {import.meta.env.VITE_DEV_BANNER === 'true' && (
        <div className={classes.devBanner}>
          <Badge color="lime" variant="filled">
            Preview Build
          </Badge>
        </div>
      )}
      <Container className={classes.globalBand} size="lg">
        <Group justify="space-between" wrap="nowrap" gap="md">
          <Link to="/factories" className={classes.logoLink}>
            <Image
              h={32}
              w="auto"
              src="/images/logo/satisfactory-logistics-logo.png"
              alt="Satisfactory Logistics Planner"
            />
          </Link>
          <Group gap="xs" wrap="nowrap" visibleFrom="sm">
            {hasSelectedGame && <GameMenu />}
            <TutorialMenu />
            <UserMenu />
          </Group>
          <Burger
            opened={drawerOpened}
            onClick={toggleDrawer}
            hiddenFrom="sm"
            size="sm"
          />
        </Group>
      </Container>
      {hasSelectedGame && (
        <Container className={classes.gameBand} size="lg" visibleFrom="sm">
          <Group justify="space-between" wrap="nowrap" gap="md">
            <Tabs
              value={activeTab ?? null}
              variant="outline"
              visibleFrom="sm"
              onChange={value => {
                if (value && value in TAB_ROUTES) {
                  navigate(TAB_ROUTES[value as HeaderTab]);
                }
              }}
              classNames={{
                root: classes.gameTabs,
                list: classes.tabsList,
                tab: classes.gameTab,
              }}
            >
              <Tabs.List>
                {TABS.map(tab => (
                  <Tabs.Tab
                    value={tab}
                    key={tab}
                    leftSection={TAB_ICONS[tab]}
                    data-tutorial-id={`header-tab-${tab}`}
                  >
                    {capitalize(tab)}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs>
            <Group gap="xs" wrap="nowrap" className={classes.gameActions}>
              <NotesPanelTrigger />
              <GameSettingsModal />
            </Group>
          </Group>
        </Container>
      )}
      <HeaderMobileDrawer
        opened={drawerOpened}
        onClose={closeDrawer}
        hasSelectedGame={hasSelectedGame}
        activeTab={activeTab}
      />
    </header>
  );
}
