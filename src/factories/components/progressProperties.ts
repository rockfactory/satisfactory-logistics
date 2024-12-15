import { FactoryProgressStatus } from '@/factories/Factory';
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
  todo: {
    color: 'yellow',
    label: 'Todo',
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
