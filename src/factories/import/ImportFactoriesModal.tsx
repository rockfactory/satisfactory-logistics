import { Button, FileButton, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconFileImport } from '@tabler/icons-react';
import { useDispatch } from 'react-redux';
import { factoryActions } from '../store/FactoriesSlice';

export interface IImportFactoriesModalProps {}

export function ImportFactoriesModal(_props: IImportFactoriesModalProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const dispatch = useDispatch();

  return (
    <>
      <Modal opened={opened} onClose={close} title="Import factories" centered>
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
                dispatch(factoryActions.import({ json: content }));
                close();
              } catch (error) {
                notifications.show({
                  title: 'Failed to import factories',
                  message: 'File is not valid JSON',
                  color: 'red',
                });
                console.error(error);
              }
            };
            reader.readAsText(file);
          }}
          accept="*/*"
        >
          {props => <Button {...props}>Select exported factories file</Button>}
        </FileButton>
      </Modal>

      <Button
        onClick={open}
        leftSection={<IconFileImport stroke={1.5} size={16} />}
      >
        Import
      </Button>
    </>
  );
}
