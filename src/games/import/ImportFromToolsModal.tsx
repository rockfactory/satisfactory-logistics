import { useStore } from '@/core/zustand';
import { Button, FileButton, Modal, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconFileExport,
  IconListCheck,
  IconTools,
  IconUpload,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

export interface IImportFromToolsModalProps {}

export function ImportFromToolsModal(props: IImportFromToolsModalProps) {
  // const {} = props;
  const [opened, { open, close }] = useDisclosure(false);
  const navigate = useNavigate();

  const handleParse = async (file: File) => {
    try {
      const { parseToolsExportedFile, convertToSerializedGame } = await import(
        './parseToolsExportedFile'
      );

      // Parse the file
      const parsed = await parseToolsExportedFile(file);

      // Convert the parsed data to the game format
      const serialized = convertToSerializedGame(parsed);

      // Load the game into the store
      useStore.getState().loadRemoteGame(serialized, {
        created_at: dayjs().toISOString(),
      });

      // Redirect to the imported game
      useStore.getState().selectGame(serialized.game.id);
      navigate(`/factories`);

      notifications.show({
        title: 'Game imported',
        message: 'Game imported successfully',
        color: 'green',
      });
    } catch (e) {
      console.error(e);
      notifications.show({
        title: 'Failed to import game',
        message: e instanceof Error ? e.message : 'Unknown error',
        color: 'red',
      });

      close();
    }
  };

  return (
    <>
      <Button
        onClick={open}
        variant="filled"
        color="gray"
        size="lg"
        leftSection={<IconTools stroke={2} size={16} />}
      >
        Import from Satisfactory Tools
      </Button>
      <Modal opened={opened} onClose={close} title="Import from Tools">
        <Text size="sm" mb="md">
          To import your factories from Satisfactory Tools, you need to export
          your game from the website and upload it here.
          <ol>
            <li>
              Click on the <IconListCheck size={20} /> icon on the left (the
              first icon before the items icons list)
            </li>
            <li>Select the production lines you want to export</li>
            <li>
              Click on the blue Export icon <IconFileExport size={20} />
            </li>
          </ol>
        </Text>

        <FileButton
          onChange={file => {
            if (!file) {
              return;
            }

            handleParse(file).catch(e => {
              console.error(e);
            });
          }}
          accept="*.txt"
        >
          {props => (
            <Button
              fullWidth
              leftSection={<IconUpload stroke={2} size={16} />}
              {...props}
            >
              Upload Tools exported File
            </Button>
          )}
        </FileButton>
      </Modal>
    </>
  );
}
