import {
  Group,
  Select,
  type ComboboxItem,
  type ComboboxLikeRenderOptionInput,
  type SelectProps,
} from '@mantine/core';
import * as React from 'react';
import { useCallback } from 'react';

export interface ISelectInputProps extends SelectProps {
  data: Array<ComboboxItem & { icon: React.ReactNode }>;
}

export function SelectIconInput(props: ISelectInputProps) {
  const renderOption = useCallback(
    (item: ComboboxLikeRenderOptionInput<ComboboxItem>) => {
      const itemWithIcon = item.option as ComboboxItem & {
        icon: React.ReactNode;
      };
      return (
        <Group gap="sm">
          {itemWithIcon.icon}
          {itemWithIcon.label}
        </Group>
      );
    },
    [],
  );

  return (
    <Select
      renderOption={renderOption}
      leftSection={
        props.value
          ? props.data.find(item => item.value === props.value)?.icon
          : null
      }
      {...props}
    />
  );
}
