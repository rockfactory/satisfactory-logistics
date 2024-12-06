import { useStore } from '@/core/zustand';
import type { FactorySimpleAttributes } from '@/factories/store/factoriesSelectors';
import { ActionIcon, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconTrash } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export interface ISolverResetButtonProps {
  id?: string;
  factory?: FactorySimpleAttributes;
}

export function SolverResetButton(props: ISolverResetButtonProps) {
  const { factory, id } = props;
  const navigate = useNavigate();

  const handleClick = () => {
    modals.openConfirmModal({
      title: 'Remove solver',
      children: (
        <Text size="sm">
          Are you sure you want to reset the solver{' '}
          {factory?.name ? `named "${factory.name}"` : ''}?
        </Text>
      ),
      labels: {
        cancel: 'Cancel',
        confirm: 'Remove',
      },
      confirmProps: {
        color: 'red',
        leftSection: <IconTrash size={16} />,
      },
      onConfirm: () => {
        useStore.getState().removeSolver(id!);
        if (factory) {
          navigate(`/factories`);
          notifications.show({
            title: 'Solver removed',
            message: `Solver for ${factory.name ?? 'factory'} removed`,
          });
        } else {
          navigate(`/factories/calculator`);
          notifications.show({
            title: 'Solver removed',
            message: `Solver removed`,
          });
        }
      },
    });
  };

  return (
    <ActionIcon color="red" variant="light" size="lg" onClick={handleClick}>
      <IconTrash size={16} />
    </ActionIcon>
  );
}
