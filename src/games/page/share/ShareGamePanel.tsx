import { Button, Group } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconShare } from '@tabler/icons-react';
import { useStore } from '@/core/zustand';
import { ShareGameModal } from './ShareGameModal';

export interface IShareGamePanelProps {
  gameId: string;
}

export function ShareGamePanel(props: IShareGamePanelProps) {
  const [opened, { close, open }] = useDisclosure();
  const savedId = useStore(state => state.games.games[props.gameId]?.savedId);

  if (!savedId) {
    return null;
  }

  return (
    <Group>
      <Button
        data-tutorial-id="game-share"
        onClick={open}
        color="blue"
        leftSection={<IconShare size={16} />}
      >
        Share game
      </Button>
      <ShareGameModal gameId={props.gameId} opened={opened} onClose={close} />
    </Group>
  );
}
