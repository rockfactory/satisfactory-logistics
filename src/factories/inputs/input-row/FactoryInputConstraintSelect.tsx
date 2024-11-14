import type { FactoryInput, FactoryInputConstraint } from '@/factories/Factory';
import { ActionIcon, Menu, Stack, Text, Tooltip } from '@mantine/core';
import { IconCheck, IconEqual, IconMathLower } from '@tabler/icons-react';
import { useCallback } from 'react';

export interface IFactoryInputConstraintSelectProps {
  input: FactoryInput;
  onChange: (value: FactoryInputConstraint) => void;
}

const FactoryInputConstraints = {
  max: {
    label: 'Less than',
    description: (
      <span>
        Use <em>at most</em> amount from this input
      </span>
    ),
    icon: <IconMathLower size={16} />,
  },
  exact: {
    label: 'Exact',
    description: (
      <span>
        Force calculator to use this input in <em>exact</em> amount
      </span>
    ),
    icon: <IconEqual size={16} />,
  },
} satisfies Record<FactoryInputConstraint, any>;

export function FactoryInputConstraintSelect(
  props: IFactoryInputConstraintSelectProps,
) {
  const { input, onChange } = props;

  const handleChange = useCallback(
    (value: string | null) => {
      onChange(value as FactoryInputConstraint);
    },
    [onChange],
  );

  const constraint = input.constraint ?? 'max';
  const current = FactoryInputConstraints[constraint];

  return (
    <Menu withinPortal loop returnFocus>
      <Menu.Target>
        <Tooltip
          color="dark.8"
          label={
            constraint === 'max' ? (
              <span>Use at most this amount</span>
            ) : (
              <span>Force usage of full input amount</span>
            )
          }
          position="top"
        >
          <ActionIcon
            mt={3}
            variant={constraint === 'max' ? 'default' : 'filled'}
            aria-label="Usage"
            color="blue"
          >
            {current.icon}
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        {Object.entries(FactoryInputConstraints).map(([value, attributes]) => (
          <Menu.Item
            key={value}
            onClick={() => handleChange(value)}
            leftSection={attributes.icon}
            rightSection={constraint === value && <IconCheck size={16} />}
          >
            <Stack gap={2}>
              <div>{attributes.label}</div>
              <Text size="xs" c="dimmed">
                {attributes.description}
              </Text>
            </Stack>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
