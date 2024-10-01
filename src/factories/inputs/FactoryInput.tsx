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
import { useFactories, WORLD_SOURCE_ID } from '../store/FactoriesSlice';

export interface IFactoryInputProps extends SelectProps {
  exceptId?: string;
  /** To provide note handling */
  worldSection?: React.ReactNode;
}

export function FactoryInput(props: IFactoryInputProps) {
  const { exceptId, worldSection, ...inputProps } = props;
  const factories = useFactories();

  const data = useMemo(
    () => [
      {
        value: WORLD_SOURCE_ID,
        label: 'World',
      },
      ...factories
        .filter(f => f.name && f.id !== exceptId)
        .map(f => ({ value: f.id, label: f.name! })),
    ],
    [factories, exceptId],
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
