import {
  Alert,
  Button,
  Divider,
  FileButton,
  Modal,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconDownload,
  IconFileImport,
  IconFilePlus,
  IconRestore,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { camelCase } from 'lodash';
import { v4 } from 'uuid';
import { useStore } from '@/core/zustand';
import {
  type SerializedGame,
  serializeGame,
} from '@/games/store/gameFactoriesActions';
import { remapSerializedGameIds } from './remapSerializedGameIds';

export interface IImportExportGameModalProps {
  gameId: string;
}

type ImportMode = 'restore' | 'create';

function readJsonFile(file: File): Promise<SerializedGame> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = e => {
      try {
        const content = e.target?.result as string;
        resolve(JSON.parse(content) as SerializedGame);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsText(file);
  });
}

export function ImportExportGameModal(props: IImportExportGameModalProps) {
  const { gameId } = props;
  const [opened, { open, close }] = useDisclosure(false);
  const gameName = useStore(state => state.games.games[gameId]?.name);

  const handleImport = async (file: File | null, mode: ImportMode) => {
    if (!file) return;

    try {
      const parsed = await readJsonFile(file);

      if (!parsed?.game || !Array.isArray(parsed.factories)) {
        throw new Error('File is not a valid game backup');
      }

      const serialized = remapSerializedGameIds(parsed, {
        targetGameId: mode === 'restore' ? gameId : v4(),
      });

      // When restoring a backup over a different game slot, keep the target
      // game's name so the user does not see the card rename unexpectedly.
      // Same-game restore and create-new both use the backup's name as-is.
      if (mode === 'restore' && parsed.game.id !== gameId && gameName) {
        serialized.game.name = gameName;
      }

      useStore
        .getState()
        .loadRemoteGame(
          serialized,
          { created_at: dayjs().toISOString() },
          { override: true },
        );

      if (mode === 'create') {
        useStore.getState().selectGame(serialized.game.id);
      }

      notifications.show({
        title: mode === 'restore' ? 'Game restored' : 'Game imported',
        message:
          mode === 'restore'
            ? `"${gameName}" was replaced with the backup contents.`
            : `Backup imported as a new game.`,
        color: 'green',
      });
      close();
    } catch (error) {
      console.error(error);
      notifications.show({
        title: 'Failed to import backup',
        message:
          error instanceof Error ? error.message : 'File is not a valid backup',
        color: 'red',
      });
    }
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        title={`Import / Export ${gameName ?? ''}`.trim()}
        size="md"
      >
        <Stack gap="lg">
          <Stack gap="xs">
            <Title order={5}>Export backup</Title>
            <Text size="sm" c="dimmed">
              Download a JSON backup of this game (factories, solvers and
              settings). You can re-import it later, or share it as a file.
            </Text>
            <Button
              fullWidth
              leftSection={<IconDownload size={16} stroke={1.5} />}
              onClick={() => {
                const json = JSON.stringify(serializeGame(gameId), null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `SatisfactoryLogistics_Game_${camelCase(gameName)}_${dayjs().format('YYYY_MM_DD[T]HH_mm_ss')}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download backup
            </Button>
          </Stack>

          <Divider />

          <Stack gap="xs">
            <Title order={5}>Restore backup into this game</Title>
            <Text size="sm" c="dimmed">
              Replace the current contents of{' '}
              <Text span fw={600}>
                {gameName}
              </Text>{' '}
              with a backup file. Factories, solvers and settings will be
              overwritten.
            </Text>
            <Alert
              variant="light"
              color="yellow"
              icon={<IconAlertTriangle size={16} />}
              p="xs"
            >
              <Text size="xs">
                This action cannot be undone. Export a backup first if you are
                unsure.
              </Text>
            </Alert>
            <FileButton
              onChange={file => {
                handleImport(file, 'restore').catch(console.error);
              }}
              accept="application/json"
            >
              {fileProps => (
                <Button
                  fullWidth
                  color="yellow"
                  variant="light"
                  leftSection={<IconRestore size={16} stroke={1.5} />}
                  {...fileProps}
                >
                  Restore into this game
                </Button>
              )}
            </FileButton>
          </Stack>

          <Divider />

          <Stack gap="xs">
            <Title order={5}>Create new game from backup</Title>
            <Text size="sm" c="dimmed">
              Import the backup as a brand new game, leaving this one untouched.
            </Text>
            <FileButton
              onChange={file => {
                handleImport(file, 'create').catch(console.error);
              }}
              accept="application/json"
            >
              {fileProps => (
                <Button
                  fullWidth
                  variant="light"
                  leftSection={<IconFilePlus size={16} stroke={1.5} />}
                  {...fileProps}
                >
                  Create new game from backup
                </Button>
              )}
            </FileButton>
          </Stack>
        </Stack>
      </Modal>

      <Button
        onClick={open}
        variant="default"
        leftSection={<IconFileImport stroke={1.5} size={16} />}
      >
        Import/Export
      </Button>
    </>
  );
}
