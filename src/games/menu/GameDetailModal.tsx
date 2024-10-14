import { useShallowStore, useStore } from '@/core/zustand';
import { Modal, TextInput } from '@mantine/core';
import { pick } from 'lodash';

export interface IGameDetailModalProps {
  opened: boolean;
  close: () => void;
  gameId: string;
}

export function GameDetailModal(props: IGameDetailModalProps) {
  const { opened, close, gameId } = props;

  const { name } = useShallowStore(state =>
    pick(state.games.games[gameId], ['name']),
  );

  return (
    <Modal opened={opened} onClose={close} title="Game Details">
      <TextInput
        label="Game Name"
        value={name}
        onChange={e => {
          useStore.getState().setName(gameId, e.currentTarget.value);
        }}
      />
    </Modal>
  );
}
