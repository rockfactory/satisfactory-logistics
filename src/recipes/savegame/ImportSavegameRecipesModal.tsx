import {
  Button,
  Divider,
  FileButton,
  List,
  Modal,
  Progress,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCloudUpload } from '@tabler/icons-react';
import type { ParsedSatisfactorySave } from './ParseSavegameMessages';

export interface IImportSavegameModalProps {
  /** Whether an import is currently running (drives the loading UI). */
  importing: boolean;
  /** Progress fraction (0-1) and optional status message. */
  progress: { value: number; message?: string };
  /**
   * Picks the file and runs the import via the parent (which owns
   * the {@link useSavegameImport} hook). Resolves with the parsed
   * save on success so the modal knows when to close, or `null` if
   * the parent aborted (e.g. no game selected).
   */
  onImport: (file: File) => Promise<ParsedSatisfactorySave | null>;
}

export function ImportSavegameRecipesModal(props: IImportSavegameModalProps) {
  const [opened, { toggle, close }] = useDisclosure();

  const handleImport = (file: File) => {
    props
      .onImport(file)
      .then(save => {
        if (save) close();
      })
      .catch(() => {
        // Notification surfaced by the parent's hook; keep the modal
        // open so the user can retry with a different file.
      });
  };

  return (
    <>
      <Tooltip label="Import this game's state from a Satisfactory save file">
        <Button
          data-tutorial-id="recipes-from-savegame"
          onClick={toggle}
          variant="default"
          leftSection={<IconCloudUpload size={16} />}
        >
          From Save
        </Button>
      </Tooltip>
      <Modal opened={opened} onClose={close} title="Import Savegame">
        <Stack gap="xs">
          <Text size="sm">
            Pick a Satisfactory <code>.sav</code> file. The save is treated as
            the source of truth for this game and will replace:
          </Text>
          <List size="sm" withPadding>
            <List.Item>Available recipes (set as the game default)</List.Item>
            <List.Item>Used resource nodes on the map</List.Item>
          </List>

          <Divider mt="sm" mb="sm" />

          <FileButton
            onChange={file => {
              if (!file) {
                return;
              }

              handleImport(file);
            }}
            accept=".sav"
          >
            {fileButtonProps => (
              <Button
                {...fileButtonProps}
                leftSection={<IconCloudUpload size={16} />}
                loading={props.importing}
              >
                Select Savegame
              </Button>
            )}
          </FileButton>

          {props.importing && (
            <>
              <Progress
                color="orange"
                value={props.progress.value * 100}
                animated
              />
              {props.progress.message && (
                <Text size="sm">{props.progress.message}</Text>
              )}
            </>
          )}
        </Stack>
      </Modal>
    </>
  );
}
