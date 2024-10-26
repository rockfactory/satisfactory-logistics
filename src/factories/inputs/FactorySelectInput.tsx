import {
  ComboboxItem,
  ComboboxLikeRenderOptionInput,
  Group,
  Select,
  SelectProps,
  Tooltip,
} from '@mantine/core';
import { IconWorld } from '@tabler/icons-react';
import React, { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { useStore } from '../../core/zustand';
import { WORLD_SOURCE_ID } from '../Factory';

export interface IFactorySelectInputProps extends SelectProps {
  exceptId?: string;
  showOnlyIds?: string[] | null;
  /** To provide note handling */
  worldSection?: React.ReactNode;
}

export function FactorySelectInput(props: IFactorySelectInputProps) {
  const { exceptId, showOnlyIds, worldSection, ...inputProps } = props;

  const factories = useStore(
    useShallow(state =>
      state.games.games[state.games.selected ?? '']?.factoriesIds.map(
        id => state.factories.factories[id],
      ),
    ),
  );

  const data = useMemo(
    () => [
      {
        value: WORLD_SOURCE_ID,
        label: 'World',
      },
      ...factories
        .filter(
          f =>
            f.name &&
            f.id !== exceptId &&
            (!showOnlyIds || showOnlyIds.includes(f.id)),
        )
        .map(f => ({ value: f.id, label: f.name! })),
    ],
    [factories, exceptId, showOnlyIds],
  );

  const renderOption = useCallback(
    (value: ComboboxLikeRenderOptionInput<ComboboxItem>) => {
      if (value.option.value === WORLD_SOURCE_ID) {
        return (
          <Group gap="xs">
            <IconWorld size={16} />
            World
          </Group>
        );
      }
      return value.option.label;
    },
    [],
  );

  return (
    <Tooltip
      disabled={data.length > 1}
      label={'Add a second factory and set its name to use it as an input.'}
      position="left"
      withArrow
    >
      <Select
        data={data}
        renderOption={renderOption}
        // Not accessible, but it's faster
        comboboxProps={{
          keepMounted: false,
        }}
        leftSection={
          inputProps.value === WORLD_SOURCE_ID
            ? (worldSection ?? <IconWorld size={16} />)
            : undefined
        }
        // label="Factories"
        searchable
        placeholder={'Select factory'}
        {...inputProps}
      />
    </Tooltip>
  );
}
