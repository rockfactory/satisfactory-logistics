import { useNavigate } from 'react-router-dom';
import { useFactorySimpleAttributes } from '@/factories/store/factoriesSelectors.ts';
import React, { useState } from 'react';
import { Button, Group, Modal, Text } from '@mantine/core';
import { useStore } from '@/core/zustand.ts';
import { IconTrash } from '@tabler/icons-react';

export const FactoryDeleteButton = ({ id }: { id: string }) => {
  const navigate = useNavigate();
  const factory = useFactorySimpleAttributes(id);
  const [opened, setOpened] = useState(false);

  return (
    <>
      <Modal
        title="Delete factory"
        size="sm"
        padding="md"
        opened={opened}
        onClose={() => setOpened(false)}
      >
        <Text size="sm">
          Are you sure you want to delete the factory{' '}
          <strong>{factory.name ?? 'Unnamed'}</strong>?
        </Text>
        <Group mt="md" gap="xs" justify="flex-end">
          <Button onClick={() => setOpened(false)} variant="default">
            Cancel
          </Button>
          <Button
            onClick={() => {
              useStore.getState().removeGameFactory(id);
              navigate('..');
            }}
            variant="filled"
            color="red"
            leftSection={<IconTrash size={16} />}
          >
            Delete
          </Button>
        </Group>
      </Modal>
      <Button
        color="red"
        variant="light"
        leftSection={<IconTrash size={16} />}
        onClick={() => setOpened(true)}
      >
        Delete factory
      </Button>
    </>
  );
};
