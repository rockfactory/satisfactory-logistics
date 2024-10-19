import {
  ActionIcon,
  Group,
  NumberInput,
  Popover,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconTrash, IconWorld } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { FormOnChangeHandler } from '../core/form/useFormOnChange';
import { useStore } from '../core/zustand';
import { WorldResourcesList } from '../recipes/WorldResources';
import {
  FactoryInputIcon,
  FactoryOutputIcon,
} from './components/peek/icons/OutputInputIcons';
import { BaseFactoryUsage } from './components/usage/FactoryUsage';
import { useOutputUsage } from './components/usage/useOutputUsage';
import { Factory, FactoryInput, WORLD_SOURCE_ID } from './Factory';
import { FactoryItemInput } from './inputs/FactoryItemInput';
import { FactorySelectInput } from './inputs/FactorySelectInput';
import { useFactoryOnChangeHandler } from './store/factoriesSelectors';
import { useIsFactoryVisible } from './useIsFactoryVisible';

export interface IFactoryInputRowProps {
  factoryId: string;
  input: FactoryInput;
  index: number;
  onChangeHandler: FormOnChangeHandler<Factory>;
}

export function FactoryInputRow(props: IFactoryInputRowProps) {
  const { index, input, factoryId } = props;

  const [focused, setFocused] = useState(false);

  const sourceOutputs = useStore(
    state => state.factories.factories[input.factoryId ?? '']?.outputs,
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
  if (!isVisible) return null;

  return (
    <Group key={index} align="flex-start" gap="sm">
      <FactorySelectInput
        exceptId={factoryId}
        value={input.factoryId}
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
        label={
          <Group gap="sm">
            Usage
            {input.factoryId && input.resource ? (
              <BaseFactoryUsage percentage={usage.percentage} />
            ) : (
              'N/A (Choose factory & resource)'
            )}
            {usage.percentage > 1 && (
              <Group gap="sm" align="center">
                Missing {usage.usedAmount - usage.producedAmount}
                <Text size="sm">
                  <FactoryOutputIcon size={16} /> {usage.producedAmount}
                </Text>
                <Text size="sm">
                  <FactoryInputIcon size={16} /> {usage.usedAmount}
                </Text>
              </Group>
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
          rightSection={
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
