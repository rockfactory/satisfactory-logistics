import type {
  FactoryOutput,
  FactoryOutputObjective,
} from '@/factories/Factory';
import {
  ActionIcon,
  Group,
  Menu,
  type ComboboxItem,
  type ComboboxLikeRenderOptionInput,
} from '@mantine/core';
import { IconCheck, IconEqual, IconMaximize } from '@tabler/icons-react';
import { useCallback } from 'react';

export interface IFactoryOutputObjectiveSelectProps {
  output: FactoryOutput;
  onChange: (value: FactoryOutputObjective) => void;
}

const renderOption = (item: ComboboxLikeRenderOptionInput<ComboboxItem>) => {
  switch (item.option.value as FactoryOutputObjective | null) {
    case 'max':
      return (
        <Group gap="xs">
          <IconMaximize size={16} />
          Maximize
        </Group>
      );
    case 'default':
    default:
      return (
        <Group gap="xs">
          <IconEqual size={16} />
          Exact
        </Group>
      );
  }
};

const FactoryOutputObjectives = {
  default: {
    label: 'Exact',
    icon: <IconEqual size={16} />,
  },
  max: {
    label: 'Maximize',
    icon: <IconMaximize size={16} />,
  },
};

export function FactoryOutputObjectiveSelect(
  props: IFactoryOutputObjectiveSelectProps,
) {
  const { output, onChange } = props;

  const handleChange = useCallback(
    (value: string | null) => {
      onChange(value as FactoryOutputObjective);
    },
    [onChange],
  );

  const current = FactoryOutputObjectives[output.objective ?? 'default'];

  return (
    <Menu withinPortal loop returnFocus>
      <Menu.Target>
        <ActionIcon variant="default" title="Objective">
          {current.icon}
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {Object.entries(FactoryOutputObjectives).map(([value, attributes]) => (
          <Menu.Item
            key={value}
            onClick={() => handleChange(value)}
            leftSection={attributes.icon}
            rightSection={output.objective === value && <IconCheck size={16} />}
          >
            {attributes.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
