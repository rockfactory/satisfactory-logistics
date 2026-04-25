import { Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconTrash } from '@tabler/icons-react';
import { useStore } from '@/core/zustand';

export interface IConfirmDeleteFactoryOptions {
  /** Optional callback invoked after the factory has been removed. */
  onAfterDelete?: () => void;
}

/**
 * Single source of truth for the "delete factory" confirmation. Both the
 * detail page button and the per-factory actions menu route through here
 * so the wording, controls and side effects stay in lockstep.
 */
export function confirmDeleteFactory(
  factoryId: string,
  options: IConfirmDeleteFactoryOptions = {},
) {
  const { onAfterDelete } = options;
  const factoryName =
    useStore.getState().factories.factories[factoryId]?.name ?? null;

  modals.openConfirmModal({
    title: 'Delete factory',
    size: 'sm',
    children: (
      <Text size="sm">
        Are you sure you want to delete the factory{' '}
        <strong>{factoryName ?? 'Unnamed'}</strong>? This cannot be undone.
      </Text>
    ),
    labels: {
      cancel: 'Cancel',
      confirm: 'Delete',
    },
    confirmProps: {
      color: 'red',
      leftSection: <IconTrash size={16} />,
    },
    onConfirm: () => {
      useStore.getState().removeGameFactory(factoryId);
      onAfterDelete?.();
    },
  });
}
