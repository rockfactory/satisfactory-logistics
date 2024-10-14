import { useShallowStore, useStore } from '@/core/zustand';
import { Button, Menu } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconChevronDown,
  IconDeviceFloppy,
  IconDeviceGamepad,
  IconPencil,
  IconPlus,
} from '@tabler/icons-react';
import { useEffect, useMemo } from 'react';
import { v4 } from 'uuid';
import { loadRemoteGamesList } from '../save/loadRemoteGames';
import { saveRemoteGame } from '../save/saveRemoteGame';
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
  const selectedId = useStore(state => state.games.selected);
  const isSaving = useStore(state => state.gameSave.isSaving);

  const [opened, { toggle, open, close }] = useDisclosure();

  const gameOptions = useGameOptions();

  useEffect(() => {
    loadRemoteGamesList().catch(console.error);
  }, []);

  return (
    <>
      <Menu>
        <Menu.Target>
          <Button
            loading={isSaving}
            variant="subtle"
            color="gray"
            leftSection={<IconDeviceGamepad size={16} />}
            rightSection={<IconChevronDown size={12} stroke={1.5} />}
          >
            {gameName ?? 'Select game'}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          {gameOptions.map(option => (
            <Menu.Item
              key={option.value}
              leftSection={<IconDeviceGamepad size={16} />}
              onClick={() => useStore.getState().selectGame(option.value)}
            >
              {option.label}
            </Menu.Item>
          ))}
          <Menu.Divider />
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
            // TODO "Login to save games"
            leftSection={<IconDeviceFloppy size={16} />}
            onClick={() => {
              saveRemoteGame(selectedId);
            }}
          >
            Save game
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      {selectedId && (
        <GameDetailModal opened={opened} close={close} gameId={selectedId} />
      )}
    </>
  );
}
