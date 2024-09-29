import { Select, SelectProps, Tooltip } from '@mantine/core';
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
    <Tooltip
      disabled={data.length > 0}
      label={'Add a second factory and set its name to use it as an input.'}
      position="left"
      withArrow
    >
      <Select
        data={data}
        // Not accessible, but it's faster
        comboboxProps={{
          keepMounted: false,
        }}
        // label="Factories"
        searchable
        placeholder={'Select factory'}
        {...props}
      />
    </Tooltip>
  );
}
