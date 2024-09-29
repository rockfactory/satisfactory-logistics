import { ActionIcon, Group, NumberInput, Tooltip } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../core/store';
import { FactoryChangeHandler } from './FactoryRow';
import { BaseFactoryUsage, useOutputUsage } from './FactoryUsage';
import { FactoryInput } from './inputs/FactoryInput';
import { FactoryItemInput } from './inputs/FactoryItemInput';
import { factoryActions, GameFactoryInput } from './store/FactoriesSlice';
import { useIsFactoryVisible } from './useIsFactoryVisible';

export interface IFactoryInputRowProps {
  factoryId: string;
  input: GameFactoryInput;
  index: number;
  onChangeFactory: FactoryChangeHandler;
}

export function FactoryInputRow(props: IFactoryInputRowProps) {
  const { index, input, factoryId, onChangeFactory } = props;
  const dispatch = useDispatch();
  const highlightedOutput = useSelector(
    (state: RootState) => state.factories.present.highlightedOutput,
  );

  const [focused, setFocused] = useState(false);

  const isHighlighted = useMemo(
    () =>
      highlightedOutput?.factoryId === input.factoryId &&
      highlightedOutput?.resource === input.resource,
    [highlightedOutput, input.factoryId, input.resource],
  );

  const sourceOutputs = useSelector(
    (state: RootState) =>
      state.factories.present.factories.find(f => f.id === input.factoryId)
        ?.outputs,
  );

  const allowedItems = useMemo(() => {
    return (
      sourceOutputs?.filter(o => o.resource).map(o => o.resource!) ?? undefined
    );
  }, [sourceOutputs]);

  const usage = useOutputUsage({
    factoryId: input.factoryId,
    output: input.resource,
  });

  const isVisible = useIsFactoryVisible(factoryId, false, input.resource);
  if (!isVisible) return null;

  return (
    <Group
      key={index}
      align="flex-start"
      gap="sm"
      bg={isHighlighted ? 'blue.2' : undefined}
    >
      <FactoryInput
        value={input.factoryId}
        w={180}
        onChange={onChangeFactory(factoryId, `inputs[${index}].factoryId`)}
      />
      <FactoryItemInput
        value={input.resource}
        allowedItems={allowedItems}
        size="sm"
        width={320}
        onChange={onChangeFactory(factoryId, `inputs[${index}].resource`)}
      />
      <Tooltip
        label={
          <Group gap="sm">
            Usage
            {input.factoryId && input.resource ? (
              <BaseFactoryUsage percentage={usage.percentage} />
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
          min={0}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          error={
            usage.percentage > 1
              ? `Usage: ${Math.round(usage.percentage * 100)}%`
              : undefined
          }
          onChange={onChangeFactory(factoryId, `inputs[${index}].amount`)}
        />
      </Tooltip>
      <ActionIcon
        variant="outline"
        color="red"
        size="md"
        onClick={() =>
          dispatch(
            factoryActions.removeInput({
              id: factoryId,
              index,
            }),
          )
        }
      >
        <IconTrash size={16} stroke={1.5} />
      </ActionIcon>
    </Group>
  );
}
