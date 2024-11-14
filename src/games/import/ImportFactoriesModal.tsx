import { Button, Divider, FileButton, Modal, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconFileImport } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { camelCase } from 'lodash';
import { useStore } from '@/core/zustand';
import { serializeGame } from '@/games/store/gameFactoriesActions';

export interface IImportExportGameModalProps {
  gameId: string;
}

export function ImportExportGameModal(props: IImportExportGameModalProps) {
  const { gameId } = props;
  const [opened, { open, close }] = useDisclosure(false);
  const gameName = useStore(
    state => state.games.games[state.games.selected ?? '']?.name,
  );

  return (
    <>
      <Modal opened={opened} onClose={close} title="Import/Export">
        <Text fz="h4" mb="md">
          Export game to file
        </Text>
        <Button
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
          Download game
        </Button>

        <Divider mt="lg" mb="lg" />

        <Text fz="h4" mb="md">
          Import game from file
        </Text>
        <FileButton
          onChange={file => {
            if (!file) {
              return;
            }

            const reader = new FileReader();
            reader.onload = e => {
              const content = e.target?.result as string;
              console.log(content, file);
              try {
                useStore.getState().loadRemoteGame(JSON.parse(content), {
                  created_at: dayjs().toISOString(),
                });
                close();
              } catch (error) {
                notifications.show({
                  title: 'Failed to import game',
                  message: 'File is not valid JSON',
                  color: 'red',
                });
                console.error(error);
              }
            };
            reader.readAsText(file);
          }}
          accept="application/json"
        >
          {props => <Button {...props}>Upload exported game</Button>}
        </FileButton>
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
