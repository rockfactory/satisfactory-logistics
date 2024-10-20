import { GameDetailModal } from '@/games/menu/GameDetailModal';
import { ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPencil } from '@tabler/icons-react';

export interface IGameDetailEditButtonProps {
  gameId: string;
}

export function GameDetailEditButton(props: IGameDetailEditButtonProps) {
  const [opened, { open, close }] = useDisclosure();
  return (
    <>
      <ActionIcon color="gray" variant="subtle" onClick={open} size="md">
        <IconPencil size={16} />
      </ActionIcon>
      <GameDetailModal gameId={props.gameId} opened={opened} close={close} />
    </>
  );
}
