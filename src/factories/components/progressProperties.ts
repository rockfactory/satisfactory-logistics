import type { MantineColor } from '@mantine/core';
import {
  IconCircle,
  IconCircleCheck,
  IconProgress,
  IconProgressHelp,
  type IconProps,
} from '@tabler/icons-react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import type { FactoryProgressStatus } from '@/factories/Factory';

export const progressProperties: Record<
  FactoryProgressStatus,
  {
    color: MantineColor;
    label: string;
    Icon: ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;
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
