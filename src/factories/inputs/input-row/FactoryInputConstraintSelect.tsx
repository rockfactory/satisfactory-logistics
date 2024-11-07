import type { FactoryInput, FactoryInputConstraint } from '@/factories/Factory';
import { isWorldResource } from '@/recipes/WorldResources';
import { ActionIcon, Menu, Stack, Text, Tooltip } from '@mantine/core';
import {
  IconArrowNarrowRightDashed,
  IconCheck,
  IconEqual,
  IconMathLower,
} from '@tabler/icons-react';
import { pick } from 'lodash';
import { useCallback, useMemo } from 'react';

export interface IFactoryInputConstraintSelectProps {
  input: FactoryInput;
  onChange: (value: FactoryInputConstraint) => void;
}

const FactoryInputConstraints = {
  none: {
    label: 'None',
    description: 'No constraint, just a link between factories',
    icon: <IconArrowNarrowRightDashed size={16} />,
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
  max: {
    label: 'Less than',
    description: (
      <span>
        Limit calculator to use <em>at most</em> this amount
      </span>
    ),
    icon: <IconMathLower size={16} />,
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

  const allowedOptions = useMemo(() => {
    const constraints =
      input.resource && isWorldResource(input.resource)
        ? pick(FactoryInputConstraints, ['none', 'exact', 'max'])
        : pick(FactoryInputConstraints, ['max', 'exact']);

    return Object.entries(constraints);
  }, [input.resource]);

  const constraint = input.constraint ?? 'none';
  const current = FactoryInputConstraints[constraint];

  return (
    <Menu withinPortal loop returnFocus>
      <Menu.Target>
        <Tooltip
          color="dark.8"
          label="Usage: limit this input amount or force usage"
          position="top"
        >
          <ActionIcon
            mt={3}
            variant={constraint === 'none' ? 'outline' : 'filled'}
            aria-label="Usage"
            color="blue"
          >
            {current.icon}
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        {allowedOptions.map(([value, attributes]) => (
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
