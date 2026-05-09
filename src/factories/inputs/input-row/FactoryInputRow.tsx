import {
  ActionIcon,
  Group,
  NumberInput,
  Popover,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import {
  IconExternalLink,
  IconHandStop,
  IconTrash,
  IconWorld,
} from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { FormOnChangeHandler } from '@/core/form/useFormOnChange';
import { useShallowStore, useStore } from '@/core/zustand';
import {
  FactoryInputIcon,
  FactoryOutputIcon,
} from '@/factories/components/peek/icons/OutputInputIcons';
import { BaseFactoryUsage } from '@/factories/components/usage/FactoryUsage';
import { useOutputUsage } from '@/factories/components/usage/useOutputUsage';
import {
  type Factory,
  type FactoryInput,
  type FactoryOutput,
  MANUAL_SOURCE_ID,
  WORLD_SOURCE_ID,
} from '@/factories/Factory';
import { FactoryItemInput } from '@/factories/inputs/FactoryItemInput';
import { FactorySelectInput } from '@/factories/inputs/FactorySelectInput';
import { useFactoryOnChangeHandler } from '@/factories/store/factoriesSelectors';
import { useIsFactoryVisible } from '@/factories/useIsFactoryVisible';
import { LogisticTypeSelect } from '@/recipes/logistics/LogisticTypeSelect';
import { WorldResourcesList } from '@/recipes/WorldResources';
import { FactoryInputConstraintSelect } from './FactoryInputConstraintSelect';

export interface IFactoryInputRowProps {
  factoryId: string;
  input: FactoryInput;
  index: number;
  onChangeHandler: FormOnChangeHandler<Factory>;
  displayMode?: 'solver' | 'factory';
}

const useAllowedItems = (
  input: FactoryInput,
  sourceOutputs: FactoryOutput[] | undefined,
) => {
  return useMemo(() => {
    if (input.factoryId === WORLD_SOURCE_ID) {
      return WorldResourcesList;
    }
    if (input.factoryId === MANUAL_SOURCE_ID) {
      // Manual inputs let the user pick any item: there is no upstream
      // factory whose outputs would constrain the choice.
      return undefined;
    }

    return (
      sourceOutputs
        ?.filter(o => o.resource && o.destination !== 'depot')
        .map(o => o.resource!) ?? undefined
    );
  }, [input.factoryId, sourceOutputs]);
};

export function FactoryInputRow(props: IFactoryInputRowProps) {
  const { index, input, factoryId, displayMode = 'factory' } = props;

  const [focused, setFocused] = useState(false);
  const forceUsageTooltip = useStore(
    state => state.tutorial.forceUsageTooltip ?? false,
  );

  const sourceOutputs = useStore(
    state => state.factories.factories[input.factoryId ?? '']?.outputs,
  );

  // Restrict the source-factory dropdown to factories that export the
  // selected item. Always include the currently-selected source so its label
  // never disappears (e.g. if the source factory's outputs were edited after
  // it was picked). Outputs marked as Dimensional Depot are not real supply
  // and must not surface a factory as a candidate source.
  const factoriesIdsProducingInputResource = useShallowStore(state =>
    input.resource
      ? state.games.games[state.games.selected ?? '']?.factoriesIds.filter(
          id =>
            id === input.factoryId ||
            state.factories.factories[id]?.outputs?.some(
              o => o.resource === input.resource && o.destination !== 'depot',
            ),
        )
      : null,
  );

  const allowedItems = useAllowedItems(input, sourceOutputs);

  const usage = useOutputUsage({
    factoryId: input.factoryId,
    output: input.resource,
  });

  // We use a dedicated onChangeHandler for this component since inputs
  // are synced with solvers
  const onChangeHandler = useFactoryOnChangeHandler(factoryId);

  // When the user picks a source factory that only produces a single item,
  // auto-fill the resource so they don't have to pick it again.
  const handleFactoryChange = useCallback(
    (selectedFactoryId: string | null) => {
      onChangeHandler(`inputs.${index}.factoryId`)(selectedFactoryId);
      if (
        !selectedFactoryId ||
        selectedFactoryId === WORLD_SOURCE_ID ||
        selectedFactoryId === MANUAL_SOURCE_ID ||
        input.resource
      ) {
        return;
      }
      const outputs =
        useStore.getState().factories.factories[selectedFactoryId]?.outputs;
      const resourceOutputs = outputs?.filter(
        o => o.resource && o.destination !== 'depot',
      );
      if (resourceOutputs?.length === 1) {
        onChangeHandler(`inputs.${index}.resource`)(
          resourceOutputs[0].resource,
        );
      }
    },
    [onChangeHandler, index, input.resource],
  );

  const isVisible = useIsFactoryVisible(factoryId, false, input.resource);
  if (!isVisible && displayMode === 'factory') return null;

  return (
    <Group key={index} align="flex-start" gap="sm">
      <FactorySelectInput
        data-tutorial-id="factory-input-source"
        // exceptId={factoryId}
        value={input.factoryId}
        showOnlyIds={factoriesIdsProducingInputResource}
        factorySection={
          input.factoryId &&
          input.factoryId !== WORLD_SOURCE_ID &&
          input.factoryId !== MANUAL_SOURCE_ID && (
            <ActionIcon
              component={Link}
              to={`/factories/${input.factoryId}`}
              size="sm"
              variant="subtle"
              color="gray"
              title="Open source factory"
              aria-label="Open source factory"
            >
              <IconExternalLink size={16} />
            </ActionIcon>
          )
        }
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
        manualSection={
          <Popover width={220} position="bottom-start" withArrow shadow="md">
            <Popover.Target>
              <ActionIcon
                size="sm"
                color="orange"
                variant={input.note ? 'filled' : 'outline'}
                title={input.note ?? 'Manual input'}
              >
                <IconHandStop size={16} />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown>
              <TextInput
                size="xs"
                description="Hand-fed amount; useful for transient or seeded inputs"
                label="Notes"
                placeholder="Note"
                value={input.note ?? ''}
                onChange={onChangeHandler(`inputs.${index}.note`)}
              />
            </Popover.Dropdown>
          </Popover>
        }
        w={180}
        onChange={handleFactoryChange}
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
          input.factoryId === MANUAL_SOURCE_ID ? (
            <span>Manual input — you supply this resource</span>
          ) : (
            <Group gap="sm">
              <span>Usage</span>
              {input.factoryId && input.resource ? (
                <BaseFactoryUsage percentage={usage.percentage} />
              ) : (
                <span>N/A (Choose factory & resource)</span>
              )}
              <Group gap="sm" align="center">
                {usage.percentage > 1 && (
                  <span>
                    Missing{' '}
                    {Math.round(
                      (usage.usedAmount - usage.producedAmount) * 100,
                    ) / 100}
                  </span>
                )}
                <Text size="sm">
                  <FactoryOutputIcon size={16} /> {usage.producedAmount}
                </Text>
                <Text size="sm">
                  <FactoryInputIcon size={16} /> {usage.usedAmount}
                </Text>
              </Group>
            </Group>
          )
        }
        position="top-start"
        opened={focused || forceUsageTooltip}
      >
        <NumberInput
          data-tutorial-id="factory-input-amount"
          value={input.amount ?? 0}
          w={100}
          min={0}
          rightSection={
            <FactoryInputIcon
              size={16}
              color={
                input.factoryId !== MANUAL_SOURCE_ID && usage.percentage > 1
                  ? 'red'
                  : undefined
              }
            />
          }
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          error={
            input.factoryId !== MANUAL_SOURCE_ID && usage.percentage > 1 ? (
              <span>
                Missing{' '}
                {Math.round((usage.usedAmount - usage.producedAmount) * 100) /
                  100}
              </span>
            ) : undefined
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
