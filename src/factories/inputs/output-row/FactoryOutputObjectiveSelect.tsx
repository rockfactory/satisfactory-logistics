import type { FactoryOutputObjective } from '@/factories/Factory';
import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import { IconArrowBarToUp, IconCheck, IconEqual } from '@tabler/icons-react';
import { useCallback } from 'react';

export interface IFactoryOutputObjectiveSelectProps {
  objective: FactoryOutputObjective | null | undefined;
  onChange: (value: FactoryOutputObjective) => void;
}

const FactoryOutputObjectives = {
  default: {
    label: 'Exact',
    tooltip: 'Objective: produce exactly this amount',
    icon: <IconEqual size={16} />,
  },
  max: {
    label: 'Maximize',
    tooltip: 'Objective: maximize production',
    icon: <IconArrowBarToUp size={16} />,
  },
};

export function FactoryOutputObjectiveSelect(
  props: IFactoryOutputObjectiveSelectProps,
) {
  const { objective, onChange } = props;

  const handleChange = useCallback(
    (value: string | null) => {
      onChange(value as FactoryOutputObjective);
    },
    [onChange],
  );

  const current = FactoryOutputObjectives[objective ?? 'default'];

  return (
    <Menu withinPortal loop returnFocus>
      <Menu.Target>
        <Tooltip label={current.tooltip} position="top" color="dark.8">
          <ActionIcon variant="default" title="Objective">
            {current.icon}
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        {Object.entries(FactoryOutputObjectives).map(([value, attributes]) => (
          <Menu.Item
            key={value}
            onClick={() => handleChange(value)}
            leftSection={attributes.icon}
            rightSection={objective === value && <IconCheck size={16} />}
          >
            {attributes.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
