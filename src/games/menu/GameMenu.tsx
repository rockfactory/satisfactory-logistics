import {
  Box,
  Button,
  Group,
  Loader,
  Menu,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconChevronDown,
  IconCircleFilled,
  IconDeviceFloppy,
  IconDeviceGamepad,
  IconDownload,
  IconHistory,
  IconList,
  IconPencil,
  IconPlus,
  IconSettings,
  IconShare,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 } from 'uuid';
import { useSession } from '@/auth/authSelectors';
import { LoginModal } from '@/auth/LoginModal';
import { useShallowStore, useStore } from '@/core/zustand';
import { generateGameName } from '@/games/gameNameGenerator';
import { ShareGameModal } from '@/games/page/share/ShareGameModal';
import { BackupHistoryModal } from '@/games/save/BackupHistoryModal';
import { loadRemoteGame } from '@/games/save/loadRemoteGame';
import { loadRemoteGamesList } from '@/games/save/loadRemoteGamesList';
import { saveRemoteGame } from '@/games/save/saveRemoteGame';
import { useGameSaveInfo } from '@/games/save/useGameSaveInfo';
import { openGameSettingsModal } from '@/games/settings/GameSettingsModal';
import { GameDetailModal } from './GameDetailModal';

export interface IGameMenuProps {}

function useGameOptions() {
  const gamesIds = useShallowStore(state =>
    Object.values(state.games.games).map(game => game.id),
  );
  const gameNames = useShallowStore(state =>
    Object.values(state.games.games).map(game => game.name),
  );

  return useMemo(() => {
    return gamesIds.map((id, index) => {
      return {
        label: gameNames[index],
        value: id,
      };
    });
  }, [gamesIds, gameNames]);
}

export function GameMenu(props: IGameMenuProps) {
  const gameName = useStore(
    state => state.games.games[state.games.selected ?? '']?.name,
  );
  const session = useSession();
  const selectedId = useStore(state => state.games.selected);
  const isSelectedSavedOnRemote = useStore(
    state => !!state.games.games[selectedId ?? '']?.savedId,
  );
  const navigate = useNavigate();
  const saveInfo = useGameSaveInfo();

  const saveStatusLabel = useMemo(() => {
    switch (saveInfo.kind) {
      case 'saving':
        return 'Saving…';
      case 'cloud-saved':
        return 'All changes saved to cloud';
      case 'cloud-dirty':
        return 'Unsaved changes';
      case 'cloud-pending':
        return 'Not yet saved';
      case 'local-only':
        return null;
    }
  }, [saveInfo]);

  const saveStatusTooltip =
    (saveInfo.kind === 'cloud-saved' || saveInfo.kind === 'cloud-dirty') &&
    saveInfo.full
      ? `Last save: ${saveInfo.full} (${saveInfo.relative})`
      : null;

  const saveStatusColor: string | undefined =
    saveInfo.kind === 'cloud-saved'
      ? 'var(--mantine-color-green-4)'
      : saveInfo.kind === 'saving'
        ? 'var(--mantine-color-blue-4)'
        : saveInfo.kind === 'cloud-dirty' || saveInfo.kind === 'cloud-pending'
          ? 'var(--mantine-color-yellow-5)'
          : undefined;

  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure();
  const [shareOpened, { open: openShare, close: closeShare }] = useDisclosure();
  const [loginOpened, { open: openLogin, close: closeLogin }] = useDisclosure();
  const [backupsOpened, { open: openBackups, close: closeBackups }] =
    useDisclosure();

  const gameOptions = useGameOptions();

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    loadRemoteGamesList().catch(console.error);
  }, [session?.user.id]);

  const handleSaveGame = useCallback(
    async (gameId: string | null) => {
      if (!gameId) {
        return;
      }

      if (!session) {
        notifications.show({
          color: 'red',
          title: 'Login to save games',
          message: 'You need to login to save games',
          icon: <IconDeviceFloppy size={16} />,
        });
        return;
      }

      await saveRemoteGame(selectedId);
    },
    [selectedId, session],
  );

  const handleLoadGame = useCallback(async (gameId: string) => {
    await loadRemoteGame(gameId, { override: true });
  }, []);

  const handleShareGame = useCallback(() => {
    if (!session) {
      openLogin();
      return;
    }
    openShare();
  }, [session, openLogin, openShare]);

  return (
    <>
      <Box data-tutorial-id="games-menu" display="inline-flex">
        <Menu>
          <Menu.Target>
            <Button
              data-tutorial-id="games-menu-trigger"
              variant="light"
              color="gray"
              leftSection={<IconDeviceGamepad size={16} />}
              rightSection={<IconChevronDown size={12} stroke={1.5} />}
            >
              {gameName ?? 'Select game'}
            </Button>
          </Menu.Target>
          <Menu.Dropdown data-tutorial-id="games-menu-dropdown">
            <Menu.Label>Change game</Menu.Label>
            {gameOptions.map(option => (
              <Menu.Item
                key={option.value}
                leftSection={<IconDeviceGamepad size={16} />}
                onClick={() => {
                  useStore.getState().selectGame(option.value);
                  navigate(`/factories`);
                }}
                rightSection={
                  selectedId === option.value && (
                    <IconCircleFilled
                      size={8}
                      color="var(--mantine-color-green-7)"
                    />
                  )
                }
              >
                {option.label}
              </Menu.Item>
            ))}

            <Menu.Item
              onClick={() => {
                useStore.getState().createGame(v4(), {
                  name: generateGameName(),
                });
              }}
              leftSection={<IconPlus color="orange" size={16} />}
            >
              New game
            </Menu.Item>
            <Menu.Divider />
            <Menu.Label>Game actions</Menu.Label>
            <Menu.Item
              leftSection={
                <IconPencil color="var(--mantine-color-blue-3)" size={16} />
              }
              onClick={() => {
                openEdit();
              }}
            >
              Rename game
            </Menu.Item>
            <Menu.Item
              leftSection={
                <IconSettings color="var(--mantine-color-gray-5)" size={16} />
              }
              onClick={openGameSettingsModal}
            >
              Game settings
            </Menu.Item>
            <Menu.Item
              data-tutorial-id="game-share-menu"
              leftSection={
                <IconShare color="var(--mantine-color-blue-4)" size={16} />
              }
              onClick={handleShareGame}
            >
              Share game
            </Menu.Item>
            <Menu.Item
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={() => handleSaveGame(selectedId)}
            >
              <Stack gap={2}>
                <Text size="sm" lh={1.2}>
                  Save game
                </Text>
                {saveStatusLabel && (
                  <Tooltip
                    label={saveStatusTooltip ?? saveStatusLabel}
                    withArrow
                    disabled={!saveStatusTooltip}
                  >
                    <Group gap={6} align="center" wrap="nowrap">
                      {saveInfo.kind === 'saving' && (
                        <Loader size={10} color="blue" />
                      )}
                      <Text
                        size="xs"
                        c="dimmed"
                        lh={1.2}
                        style={{ color: saveStatusColor }}
                      >
                        {saveStatusLabel}
                      </Text>
                    </Group>
                  </Tooltip>
                )}
              </Stack>
            </Menu.Item>
            {selectedId && isSelectedSavedOnRemote && (
              <Menu.Item
                leftSection={<IconDownload size={16} />}
                onClick={() => handleLoadGame(selectedId)}
              >
                Load last save
              </Menu.Item>
            )}
            {selectedId && isSelectedSavedOnRemote && (
              <Menu.Item
                data-tutorial-id="game-backup-history-menu"
                leftSection={
                  <IconHistory color="var(--mantine-color-red-4)" size={16} />
                }
                onClick={openBackups}
              >
                Backup history
              </Menu.Item>
            )}
            <Menu.Divider />
            <Menu.Item
              data-tutorial-id="games-menu-list"
              leftSection={<IconList size={16} />}
              onClick={() => {
                navigate(`/games`);
              }}
            >
              Games list
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Box>
      {selectedId && (
        <GameDetailModal
          opened={editOpened}
          close={closeEdit}
          gameId={selectedId}
        />
      )}
      {selectedId && (
        <ShareGameModal
          gameId={selectedId}
          opened={shareOpened}
          onClose={closeShare}
        />
      )}
      {selectedId && (
        <BackupHistoryModal
          gameId={selectedId}
          opened={backupsOpened}
          onClose={closeBackups}
        />
      )}
      <LoginModal
        opened={loginOpened}
        close={closeLogin}
        message="Log in to share your Game with friends. After login, the share link is generated automatically."
      />
    </>
  );
}
