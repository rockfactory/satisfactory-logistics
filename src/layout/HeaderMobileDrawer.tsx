import { Divider, Drawer, NavLink, Stack, Text } from '@mantine/core';
import {
  IconDeviceGamepad,
  IconNotebook,
  IconSettings,
} from '@tabler/icons-react';
import { capitalize } from 'lodash';
import { useNavigate } from 'react-router-dom';
import { UserMenu } from '@/auth/UserMenu';
import { useStore } from '@/core/zustand';
import { openGameSettingsModal } from '@/games/settings/GameSettingsModal';
import { TutorialMenu } from '@/tutorial/TutorialMenu';
import { TAB_ICONS, TAB_ROUTES } from './Header';

type TabId = keyof typeof TAB_ROUTES;

export interface HeaderMobileDrawerProps {
  opened: boolean;
  onClose: () => void;
  hasSelectedGame: boolean;
  activeTab: TabId | null;
}

export function HeaderMobileDrawer({
  opened,
  onClose,
  hasSelectedGame,
  activeTab,
}: HeaderMobileDrawerProps) {
  const navigate = useNavigate();
  const gameName = useStore(
    state => state.games.games[state.games.selected ?? '']?.name,
  );
  const toggleNotes = useStore(state => state.toggleNotesPanel);

  const navigateTo = (tab: TabId) => {
    navigate(TAB_ROUTES[tab]);
    onClose();
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      size="xs"
      title="Menu"
      hiddenFrom="sm"
    >
      <Stack gap="xs">
        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
          Navigation
        </Text>
        {(['factories', 'charts', 'calculator', 'tools', 'codex'] as const).map(
          tab => (
            <NavLink
              key={tab}
              label={capitalize(tab)}
              leftSection={TAB_ICONS[tab]}
              active={activeTab === tab}
              onClick={() => navigateTo(tab)}
            />
          ),
        )}
        <Divider my="xs" />
        <TutorialMenu />
        <UserMenu />

        {hasSelectedGame && (
          <>
            <Divider my="xs" />
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              Game {gameName ? `· ${gameName}` : ''}
            </Text>
            <NavLink
              label="Notes"
              leftSection={<IconNotebook size={18} />}
              onClick={() => {
                toggleNotes();
                onClose();
              }}
            />
            <NavLink
              label="Game settings"
              leftSection={<IconSettings size={18} />}
              onClick={() => {
                openGameSettingsModal();
                onClose();
              }}
            />
            <NavLink
              label="Manage games"
              leftSection={<IconDeviceGamepad size={18} />}
              onClick={() => {
                navigate('/games');
                onClose();
              }}
            />
          </>
        )}
      </Stack>
    </Drawer>
  );
}
