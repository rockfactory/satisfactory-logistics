import {
  Button,
  Checkbox,
  Divider,
  Group,
  Modal,
  Progress,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
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
  const [importError, setImportError] = useState<string | null>(null);

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

          <Dropzone
            onDrop={files => {
              if (!files[0]) return;

              // If we're here then files were valid types and accepted
              setImportError(null);

              handleImport(files[0]);
            }}
            onReject={fileRejections =>
              fileRejections[0].errors[0].code === 'file-invalid-type'
                ? setImportError(
                    'Uploaded file is not a Satisfactory save file',
                  )
                : setImportError(fileRejections[0].errors[0].message)
            }
            accept={['.sav']}
            multiple={false}
            loading={importing}
            style={{
              borderColor: 'var(--mantine-color-satisfactory-orange-5)',
            }}
            // This fixes the OS native file picker not filtering by the "accept" file type on click
            // The underlying react-dropzone seems to be using a new File System Access API by default
            // where this filtering doesn't work properly. This flag triggers the file picker
            // using a programmatic click event on the file input
            // The things we have to do for non-standard file types... :/
            // https://github.com/react-dropzone/react-dropzone/issues/1265
            useFsAccessApi={false}
            validator={file => {
              // Checks if file type is a .sav file, the extension used by Satisfactory
              if (file.name && file.name.split('.').pop() === 'sav') {
                return null;
              }
              return {
                code: 'file-invalid-type',
                message: 'Uploaded file is not a Satisfactory save file',
              };
            }}
          >
            <Group justify="center" gap="md">
              <ThemeIcon variant="transparent" c="satisfactory-orange">
                <IconCloudUpload size={20} />
              </ThemeIcon>
              <Text size="md" c="satisfactory-orange">
                Click to upload or drag a save file here
              </Text>
            </Group>
          </Dropzone>
          {importError ? (
            <Text c={'red'} size="sm">
              {importError}
            </Text>
          ) : null}

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
