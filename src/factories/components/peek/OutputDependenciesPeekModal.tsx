import { ActionIcon, Modal, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEye } from '@tabler/icons-react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { FactoryOutput } from '@/factories/Factory';
import { OutputDependenciesTable } from './OutputDependenciesTable';

export interface IOutputDependenciesPeekModalProps {
  factoryId: string;
  output: FactoryOutput;
}

export function OutputDependenciesPeekModal(
  props: IOutputDependenciesPeekModalProps,
) {
  const [opened, { open, close }] = useDisclosure(false);
  const { pathname } = useLocation();

  // biome-ignore lint/correctness/useExhaustiveDependencies: close modal on route change
  useEffect(() => {
    close();
  }, [pathname]);

  return (
    <div>
      <Tooltip label="View output dependencies" withArrow>
        <ActionIcon variant="outline" color="blue.4" size="md" onClick={open}>
          <IconEye size={16} stroke={1.5} />
        </ActionIcon>
      </Tooltip>
      <Modal
        opened={opened}
        onClose={close}
        title="Output dependencies"
        centered
        size="lg"
        keepMounted={false}
      >
        <OutputDependenciesTable {...props} />
      </Modal>
    </div>
  );
}
