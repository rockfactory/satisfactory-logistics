import { Button } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { confirmDeleteFactory } from '@/factories/details/confirmDeleteFactory';

export const FactoryDeleteButton = ({ id }: { id: string }) => {
  const navigate = useNavigate();

  return (
    <Button
      color="red"
      variant="light"
      leftSection={<IconTrash size={16} />}
      onClick={() =>
        confirmDeleteFactory(id, {
          onAfterDelete: () => navigate('..'),
        })
      }
    >
      Delete factory
    </Button>
  );
};
