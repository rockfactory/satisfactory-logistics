import {
  Button,
  Checkbox,
  Divider,
  FileButton,
  Modal,
  Progress,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCloudUpload } from '@tabler/icons-react';
import { useState } from 'react';
import type { ParsedSatisfactorySave } from './ParseSavegameMessages';
import { startSavegameParsing } from './startSavegameParsing';

export interface IImportSavegameModalProps {
  onImported?: (save: ParsedSatisfactorySave, asDefault: boolean) => void;
}

export function ImportSavegameRecipesModal(props: IImportSavegameModalProps) {
  const [opened, { toggle, close }] = useDisclosure();
  const [importing, setImporting] = useState(false);
  const [asDefault, setAsDefault] = useState(true);
  const [progress, setProgress] = useState({
    value: 0,
    message: undefined as string | undefined,
  });

  const handleImport = (file: File) => {
    setImporting(true);
    setProgress({ value: 0, message: undefined });
    startSavegameParsing(file, (progress, message) => {
      setProgress({ value: progress, message });
    })
      .then(save => {
        // console.log('Parsed:', save.json);
        setImporting(false);
        notifications.show({
          title: 'Savegame imported',
          message: 'Savegame recipes have been imported successfully',
          color: 'green',
        });
        props.onImported?.(save, asDefault);
        close();
      })
      .catch(e => {
        console.error('Error while parsing:', e.message);
        setImporting(false);
        notifications.show({
          title: 'Error while parsing savegame',
          message: e.message,
          color: 'red',
        });
      });
  };

  return (
    <>
      <Tooltip color="dark.8" label="Import available recipes from a Savegame">
        <Button
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
            Select a savegame file to import available recipes from it.
          </Text>

          <Divider mt="sm" mb="sm" />

          <Checkbox
            checked={asDefault}
            onChange={e => setAsDefault(e.currentTarget.checked)}
            label="Set as Game default"
            description="If checked, imported recipes will be set as default for this game: new factories will have these recipes selected by default"
          />

          <FileButton
            onChange={file => {
              if (!file) {
                return;
              }

              handleImport(file);
            }}
            accept=".sav"
          >
            {props => (
              <Button
                {...props}
                leftSection={<IconCloudUpload size={16} />}
                loading={importing}
              >
                Select Savegame
              </Button>
            )}
          </FileButton>

          {importing && (
            <>
              <Progress color="orange" value={progress.value * 100} animated />
              {progress.message && <Text size="sm">{progress.message}</Text>}
            </>
          )}
        </Stack>
      </Modal>
    </>
  );
}
