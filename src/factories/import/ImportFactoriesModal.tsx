import { Button, Divider, FileButton, Modal, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconFileImport } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useDispatch } from 'react-redux';
import { store } from '../../core/store';
import { factoryActions } from '../store/FactoriesSlice';

export interface IImportFactoriesModalProps {}

export function ImportFactoriesModal(_props: IImportFactoriesModalProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const dispatch = useDispatch();

  return (
    <>
      <Modal opened={opened} onClose={close} title="Import/Export">
        <Text fz="h4" mb="md">
          Export factories to file
        </Text>
        <Button
          onClick={() => {
            const json = JSON.stringify(
              {
                factories: store.getState().factories.present.factories,
              },
              null,
              2,
            );
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `SatisfactoryLogistics_Factories_${dayjs().format('YYYY_MM_DD[T]HH_mm_ss')}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download factories
        </Button>

        <Divider mt="lg" mb="lg" />

        <Text fz="h4" mb="md">
          Import factories from file
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
          accept="application/json"
        >
          {props => <Button {...props}>Upload exported factories</Button>}
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
