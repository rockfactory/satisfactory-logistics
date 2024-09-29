import { Select, SelectProps } from '@mantine/core';
import { useMemo } from 'react';
import { useFactories } from '../store/FactoriesSlice';

export interface IFactoryInputProps extends SelectProps {
  exceptId?: string;
}

export function FactoryInput(props: IFactoryInputProps) {
  const { exceptId } = props;
  const factories = useFactories();

  const data = useMemo(
    () =>
      factories
        .filter(f => f.name && f.id !== exceptId)
        .map(f => ({ value: f.id, label: f.name! })),
    [factories, exceptId],
  );

  return (
    <Select
      data={data}
      // Not accessible, but it's faster
      comboboxProps={{
        keepMounted: false,
      }}
      // label="Factories"
      searchable
      placeholder="Select factory"
      {...props}
    />
  );
}
