import {
  Badge,
  Burger,
  Container,
  Group,
  Image,
  Tabs,
  useMantineTheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { capitalize } from 'lodash';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserMenu } from '@/auth/UserMenu';
import { useStore } from '@/core/zustand';
import { GameMenu } from '@/games/menu/GameMenu';
import { GameSettingsModal } from '@/games/settings/GameSettingsModal';
import { NotesPanelTrigger } from '@/notes/NotesPanelTrigger';
import { TutorialMenu } from '@/tutorial/TutorialMenu';
import classes from './Header.module.css';

const TABS = ['factories', 'charts', 'calculator', 'tools', 'codex'] as const;

type HeaderTab = (typeof TABS)[number];

const TAB_ROUTES: Record<HeaderTab, string> = {
  factories: '/factories',
  charts: '/factories/charts',
  calculator: '/factories/calculator',
  tools: '/tools',
  codex: '/codex',
};

function resolveActiveTab(pathname: string): HeaderTab {
  if (pathname.startsWith('/tools')) return 'tools';
  if (pathname.startsWith('/codex')) return 'codex';
  if (pathname.startsWith('/factories/charts')) return 'charts';
  if (pathname.startsWith('/factories/calculator')) return 'calculator';
  return 'factories';
}

export function Header() {
  const theme = useMantineTheme();
  const [opened, { toggle }] = useDisclosure(false);
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
      <Container className={classes.mainSection} size="lg">
        <Group justify="space-between">
          <Group align="flex-start">
            <Link to="/factories">
              <Image
                h={32}
                miw={200}
                w="auto"
                src="/images/logo/satisfactory-logistics-logo.png"
                alt="Satisfactory Logistics Planner"
              />
            </Link>
          </Group>
          <Burger opened={opened} onClick={toggle} hiddenFrom="xs" size="sm" />
          <Group>
            <GameMenu />
            {hasSelectedGame && <GameSettingsModal />}
            {hasSelectedGame && <NotesPanelTrigger />}
            <TutorialMenu />
            <UserMenu />
          </Group>
        </Group>
      </Container>
      <Container size="lg">
        <Tabs
          defaultValue="factories"
          value={activeTab}
          variant="outline"
          visibleFrom="sm"
          onChange={value => {
            if (value && value in TAB_ROUTES) {
              navigate(TAB_ROUTES[value as HeaderTab]);
            }
          }}
          classNames={{
            root: classes.tabs,
            list: classes.tabsList,
            tab: classes.tab,
          }}
        >
          <Tabs.List>
            {TABS.map(tab => (
              <Tabs.Tab
                value={tab}
                key={tab}
                data-tutorial-id={`header-tab-${tab}`}
              >
                {capitalize(tab)}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
      </Container>
    </header>
  );
}
