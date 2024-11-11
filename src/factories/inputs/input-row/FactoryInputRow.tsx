import { LogisticTypeSelect } from '@/recipes/logistics/LogisticTypeSelect';
import {
  ActionIcon,
  Group,
  Popover,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconTrash, IconWorld } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { FormOnChangeHandler } from '../../../core/form/useFormOnChange';
import { useShallowStore, useStore } from '../../../core/zustand';
import { WorldResourcesList } from '../../../recipes/WorldResources';
import {
  FactoryInputIcon,
  FactoryOutputIcon,
} from '../../components/peek/icons/OutputInputIcons';
import { BaseFactoryUsage } from '../../components/usage/FactoryUsage';
import { useOutputUsage } from '../../components/usage/useOutputUsage';
import { Factory, FactoryInput, WORLD_SOURCE_ID } from '../../Factory';
import { useFactoryOnChangeHandler } from '../../store/factoriesSelectors';
import { useIsFactoryVisible } from '../../useIsFactoryVisible';
import { FactoryItemInput } from '../FactoryItemInput';
import { FactoryNumberInput } from '../FactoryNumberInput';
import { FactorySelectInput } from '../FactorySelectInput';
import { FactoryInputConstraintSelect } from './FactoryInputConstraintSelect';

export interface IFactoryInputRowProps {
  factoryId: string;
  input: FactoryInput;
  index: number;
  onChangeHandler: FormOnChangeHandler<Factory>;
  displayMode?: 'solver' | 'factory';
}

export function FactoryInputRow(props: IFactoryInputRowProps) {
  const { index, input, factoryId, displayMode = 'factory' } = props;

  const [focused, setFocused] = useState(false);

  const sourceOutputs = useStore(
    state => state.factories.factories[input.factoryId ?? '']?.outputs,
  );

  // Only if the factory is not selected, we can use the resource to filter
  // the allowed factories
  const factoriesIdsProducingInputResource = useShallowStore(state =>
    input.resource && !input.factoryId
      ? state.games.games[state.games.selected ?? '']?.factoriesIds.filter(id =>
          state.factories.factories[id]?.outputs.some(
            o => o.resource === input.resource,
          ),
        )
      : null,
  );

  const allowedItems = useMemo(() => {
    return input.factoryId === WORLD_SOURCE_ID
      ? WorldResourcesList
      : (sourceOutputs?.filter(o => o.resource).map(o => o.resource!) ??
          undefined);
  }, [input.factoryId, sourceOutputs]);

  const usage = useOutputUsage({
    factoryId: input.factoryId,
    output: input.resource,
  });

  // We use a dedicated onChangeHandler for this component since inputs
  // are synced with solvers
  const onChangeHandler = useFactoryOnChangeHandler(factoryId);

  const isVisible = useIsFactoryVisible(factoryId, false, input.resource);
  if (!isVisible && displayMode === 'factory') return null;

  return (
    <Group key={index} align="flex-start" gap="sm">
      <FactorySelectInput
        // exceptId={factoryId}
        value={input.factoryId}
        showOnlyIds={factoriesIdsProducingInputResource}
        worldSection={
          <Popover width={200} position="bottom-start" withArrow shadow="md">
            <Popover.Target>
              <ActionIcon
                size="sm"
                color="blue"
                variant={input.note ? 'filled' : 'outline'}
                title={input.note ?? 'Add note'}
              >
                <IconWorld size={16} />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown>
              <TextInput
                size="xs"
                description="Helps to remember where this input is sourced from"
                label="Notes"
                placeholder="Note"
                value={input.note ?? ''}
                onChange={onChangeHandler(`inputs.${index}.note`)}
              />
            </Popover.Dropdown>
          </Popover>
        }
        w={180}
        onChange={onChangeHandler(`inputs.${index}.factoryId`)}
      />
      <FactoryItemInput
        value={input.resource}
        allowedItems={allowedItems}
        size="sm"
        width={320}
        onChange={onChangeHandler(`inputs.${index}.resource`)}
      />
      <Tooltip
        color="dark.8"
        label={
          <Group gap="sm">
            Usage
            {input.factoryId && input.resource ? (
              <BaseFactoryUsage percentage={usage.percentage} />
            ) : (
              'N/A (Choose factory & resource)'
            )}
            <Group gap="sm" align="center">
              {usage.percentage > 1 && (
                <span>Missing {usage.usedAmount - usage.producedAmount}</span>
              )}
              <Text size="sm">
                <FactoryOutputIcon size={16} /> {usage.producedAmount}
              </Text>
              <Text size="sm">
                <FactoryInputIcon size={16} /> {usage.usedAmount}
              </Text>
            </Group>
          </Group>
        }
        position="top-start"
        opened={focused}
      >
        <FactoryNumberInput
          value={input.amount ?? 0}
          w={110}
          min={0}
          allowNegative={false}
          leftSection={
            <FactoryInputIcon
              size={16}
              color={usage.percentage > 1 ? 'red' : undefined}
            />
          }
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          error={
            usage.percentage > 1
              ? `Missing ${usage.usedAmount - usage.producedAmount}`
              : undefined
          }
          onChange={onChangeHandler(`inputs.${index}.amount`)}
        />
      </Tooltip>
      {displayMode === 'factory' && (
        <LogisticTypeSelect
          allowDeselect
          value={input.transport}
          onChange={onChangeHandler(`inputs.${index}.transport`)}
          w={120}
        />
      )}

      {displayMode === 'solver' && (
        <FactoryInputConstraintSelect
          input={input}
          onChange={onChangeHandler(`inputs.${index}.constraint`)}
        />
      )}

      <ActionIcon
        variant="outline"
        color="red"
        size="md"
        mt={3}
        onClick={() => {
          useStore.getState().removeFactoryInput(factoryId, index);
        }}
      >
        <IconTrash size={16} stroke={1.5} />
      </ActionIcon>
    </Group>
  );
}
