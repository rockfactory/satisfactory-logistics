import { FactoryProgressStatus } from '@/factories/Factory.ts';
import { Badge, BadgeProps } from '@mantine/core';
import {
  Icon, IconCircle, IconCircleCheck,
  IconProgress,
  IconProgressHelp, IconProps,
} from '@tabler/icons-react';
import { ForwardRefExoticComponent, RefAttributes } from 'react';
import { MantineColor } from '@mantine/core';

export const progressProperties: Record<
  FactoryProgressStatus,
  {
    color: MantineColor;
    label: string;
    Icon: ForwardRefExoticComponent<
      IconProps & RefAttributes<Icon>
    >;
  }
> = {
  draft: {
    color: 'gray',
    label: 'Draft',
    Icon: IconProgressHelp
  },
  to_be_done: {
    color: 'yellow',
    label: 'To Be Done',
    Icon: IconCircle
  },
  in_progress: {
    color: 'blue',
    label: 'progress',
    Icon: IconProgress
  },
  done: {
    color: 'green',
    label: 'Done',
    Icon: IconCircleCheck
  },
};

export const ProgressChip = ({
  status,
  ...props
}: { status?: FactoryProgressStatus } & Omit<
  BadgeProps,
  'leftSection' | 'color' | 'children'
>) => {
  if (!status) {
    return null;
  }
  const chipProps = progressProperties[status];
  if (!chipProps) {
    return null;
  }

  return <Badge
    color={chipProps.color}
    leftSection={<chipProps.Icon size={12} />}
    {...props}
  >
    {chipProps.label}
  </Badge>;
};
