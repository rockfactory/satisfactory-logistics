import { Button, Group } from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import { useDispatch } from 'react-redux';
import { ActionCreators } from 'redux-undo';

export interface IFactoryUndoButtonsProps {}

export function FactoryUndoButtons(props: IFactoryUndoButtonsProps) {
  const dispatch = useDispatch();
  useHotkeys([
    [
      'mod+z',
      e => {
        e.preventDefault();
        dispatch(ActionCreators.undo());
      },
    ],
    [
      'shift+mod+z',
      e => {
        e.preventDefault();
        dispatch(ActionCreators.redo());
      },
    ],
  ]);
  return (
    <Group gap="sm">
      <Button onClick={() => dispatch(ActionCreators.undo())}>Undo</Button>
      <Button onClick={() => dispatch(ActionCreators.redo())}>Redo</Button>
    </Group>
  );
}
