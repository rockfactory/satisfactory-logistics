import { FactoryProgressStatus } from '@/factories/Factory.ts';
import { MantineColor } from '@mantine/core';
import { ForwardRefExoticComponent, RefAttributes } from 'react';
import {
  Icon,
  IconCircle,
  IconCircleCheck,
  IconProgress,
  IconProgressHelp,
  IconProps,
} from '@tabler/icons-react';

export const progressProperties: Record<
  FactoryProgressStatus,
  {
    color: MantineColor;
    label: string;
    Icon: ForwardRefExoticComponent<IconProps & RefAttributes<Icon>>;
  }
> = {
  draft: {
    color: 'gray',
    label: 'Draft',
    Icon: IconProgressHelp,
  },
  to_be_done: {
    color: 'yellow',
    label: 'To Be Done',
    Icon: IconCircle,
  },
  in_progress: {
    color: 'blue',
    label: 'In progress',
    Icon: IconProgress,
  },
  done: {
    color: 'green',
    label: 'Done',
    Icon: IconCircleCheck,
  },
};
