import { ActionIcon, Group, NumberInput, Tooltip } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../core/store';
import { FactoryChangeHandler } from './FactoryRow';
import { FactoryUsage } from './FactoryUsage';
import { FactoryInput } from './inputs/FactoryInput';
import { FactoryItemInput } from './inputs/FactoryItemInput';
import {
  factoryActions,
  GameFactory,
  GameFactoryInput,
  useFactories,
} from './store/FactoriesSlice';
import { useIsFactoryVisible } from './useIsFactoryVisible';

export interface IFactoryInputRowProps {
  factory: GameFactory;
  input: GameFactoryInput;
  index: number;
  onChangeFactory: FactoryChangeHandler;
}

export function FactoryInputRow(props: IFactoryInputRowProps) {
  const { index, input, factory, onChangeFactory } = props;
  const dispatch = useDispatch();
  const factories = useFactories();
  const highlightedOutput = useSelector(
    (state: RootState) => state.factories.present.highlightedOutput,
  );

  const sourceFactory = useMemo(
    () => factories.find(f => f.id === input.factoryId),
    [factories, input.factoryId],
  );

  const [focused, setFocused] = useState(false);

  const isHighlighted = useMemo(
    () =>
      highlightedOutput?.factoryId === input.factoryId &&
      highlightedOutput?.resource === input.resource,
    [highlightedOutput, input.factoryId, input.resource],
  );

  const isVisible = useIsFactoryVisible(factory.id, false, input.resource);
  if (!isVisible) return null;

  return (
    <Group key={index} gap="sm" bg={isHighlighted ? 'blue.2' : undefined}>
      <FactoryInput
        value={input.factoryId}
        w={180}
        onChange={onChangeFactory(factory.id, `inputs[${index}].factoryId`)}
      />
      <FactoryItemInput
        value={input.resource}
        allowedItems={
          sourceFactory?.outputs
            ?.filter(o => o.resource)
            .map(o => o.resource!) ?? undefined
        }
        size="sm"
        width={320}
        onChange={onChangeFactory(factory.id, `inputs[${index}].resource`)}
      />
      <Tooltip
        label={
          <Group gap="sm">
            Usage
            {input.factoryId && input.resource ? (
              <FactoryUsage
                factoryId={input.factoryId}
                output={input.resource}
              />
            ) : (
              'N/A (Choose factory & resource)'
            )}
          </Group>
        }
        position="top-start"
        opened={focused}
      >
        <NumberInput
          value={input.amount ?? 0}
          w={100}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={onChangeFactory(factory.id, `inputs[${index}].amount`)}
        />
      </Tooltip>
      <ActionIcon
        variant="outline"
        color="red"
        size="md"
        onClick={() =>
          dispatch(
            factoryActions.update({
              id: factory.id,
              inputs: factory.inputs?.filter((_, i) => i !== index),
            }),
          )
        }
      >
        <IconTrash size={16} stroke={1.5} />
      </ActionIcon>
    </Group>
  );
}
