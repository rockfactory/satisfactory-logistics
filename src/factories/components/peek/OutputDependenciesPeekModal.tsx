import { ActionIcon, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEye } from '@tabler/icons-react';
import { GameFactoryOutput } from '../../store/FactoriesSlice';
import { OutputDependenciesTable } from './OutputDependenciesTable';

export interface IOutputDependenciesPeekModalProps {
  factoryId: string;
  output: GameFactoryOutput;
}

export function OutputDependenciesPeekModal(
  props: IOutputDependenciesPeekModalProps,
) {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <div>
      <ActionIcon variant="outline" color="blue.4" size="md" onClick={open}>
        <IconEye size={16} stroke={1.5} />
      </ActionIcon>
      <Modal
        opened={opened}
        onClose={close}
        title="Output dependencies"
        centered
        keepMounted={false}
      >
        <OutputDependenciesTable {...props} />
      </Modal>
    </div>
  );
}
