import { useSession } from '@/auth/authSelectors';
import { useShallowStore, useStore } from '@/core/zustand';
import { Button, Menu } from '@mantine/core';
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
} from '@tabler/icons-react';
import cx from 'clsx';
import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 } from 'uuid';
import { loadRemoteGame } from '../save/loadRemoteGame';
import { loadRemoteGamesList } from '../save/loadRemoteGamesList';
import { saveRemoteGame } from '../save/saveRemoteGame';
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
  const navigate = useNavigate();

  const [opened, { toggle, open, close }] = useDisclosure();

  const gameOptions = useGameOptions();

  useEffect(() => {
    loadRemoteGamesList().catch(console.error);
  }, [session]);

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
      <Button.Group>
        <Menu>
          <Menu.Target>
            <Button
              loading={isSaving}
              variant="light"
              color="gray"
              leftSection={<IconDeviceGamepad size={16} />}
              rightSection={<IconChevronDown size={12} stroke={1.5} />}
            >
              {gameName ?? 'Select game'}
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
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
                  selectedId == option.value && (
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
              Edit game
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
          className={cx(classes.gameMenuSecondaryButton)}
          variant="light"
          color="gray"
          onClick={() => {
            handleSaveGame(selectedId);
          }}
        >
          <IconDeviceFloppy size={16} />
        </Button>
      </Button.Group>
      {selectedId && (
        <GameDetailModal opened={opened} close={close} gameId={selectedId} />
      )}
    </>
  );
}
