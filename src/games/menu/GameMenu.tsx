import { Box, Button, Menu } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconChevronDown,
  IconCircleFilled,
  IconDeviceFloppy,
  IconDeviceGamepad,
  IconDownload,
  IconList,
  IconPencil,
  IconPlus,
  IconSettings,
} from '@tabler/icons-react';
import cx from 'clsx';
import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 } from 'uuid';
import { useSession } from '@/auth/authSelectors';
import { useShallowStore, useStore } from '@/core/zustand';
import { loadRemoteGame } from '@/games/save/loadRemoteGame';
import { loadRemoteGamesList } from '@/games/save/loadRemoteGamesList';
import { saveRemoteGame } from '@/games/save/saveRemoteGame';
import { openGameSettingsModal } from '@/games/settings/GameSettingsModal';
import { GameDetailModal } from './GameDetailModal';
import classes from './GameMenu.module.css';

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
  const isSaving = useStore(state => state.gameSave.isSaving);
  const isSyncConnected = useStore(
    state => state.gameSave.isRealtimeSyncConnected,
  );
  const navigate = useNavigate();

  const [opened, { toggle, open, close }] = useDisclosure();

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

  return (
    <>
      <Box pos="relative" style={{ display: 'inline-flex' }}>
        <Button.Group data-tutorial-id="games-menu">
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
                    name:
                      'New Game ' +
                      (Object.keys(useStore.getState().games.games).length + 1),
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
                  open();
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
                leftSection={<IconDeviceFloppy size={16} />}
                onClick={() => handleSaveGame(selectedId)}
              >
                Save game
              </Menu.Item>
              {selectedId && isSelectedSavedOnRemote && (
                <Menu.Item
                  leftSection={<IconDownload size={16} />}
                  onClick={() => handleLoadGame(selectedId)}
                >
                  Load last save
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
          <Button
            data-tutorial-id="game-save-button"
            className={cx(classes.gameMenuSecondaryButton)}
            variant="light"
            color="gray"
            loading={isSaving}
            onClick={() => {
              handleSaveGame(selectedId);
            }}
          >
            <IconDeviceFloppy size={16} />
          </Button>
        </Button.Group>
        {isSyncConnected && (
          <IconCircleFilled
            size={8}
            color="var(--mantine-color-green-6)"
            style={{ position: 'absolute', top: -2, right: -2 }}
          />
        )}
      </Box>
      {selectedId && (
        <GameDetailModal opened={opened} close={close} gameId={selectedId} />
      )}
    </>
  );
}
