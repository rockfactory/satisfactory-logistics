import {
  IconBuildingFactory2,
  IconHighlight,
  IconRoute,
  IconVectorBezier2,
} from '@tabler/icons-react';
import type { Ref } from 'react';
import type { FormOnChangeHandler } from '@/core/form/useFormOnChange';
import type { GameSettings } from '@/games/Game';

export type SectionId = 'highlighting' | 'transport' | 'graph' | 'buildings';

export interface SectionComponentProps {
  ref?: Ref<HTMLDivElement>;
  settings: GameSettings | undefined;
  onChange: FormOnChangeHandler<GameSettings>;
}

export interface Section {
  id: SectionId;
  label: string;
  description: string;
  icon: typeof IconHighlight;
  color: string;
}

export const SETTINGS_SECTIONS: Section[] = [
  {
    id: 'highlighting',
    label: 'Usage Highlighting',
    description: '100% usage colors',
    icon: IconHighlight,
    color: 'blue',
  },
  {
    id: 'transport',
    label: 'Transport Limits',
    description: 'Max belt & pipeline',
    icon: IconRoute,
    color: 'orange',
  },
  {
    id: 'graph',
    label: 'Graph Display',
    description: 'Edges rendering',
    icon: IconVectorBezier2,
    color: 'grape',
  },
  {
    id: 'buildings',
    label: 'Available Buildings',
    description: 'Solver restrictions',
    icon: IconBuildingFactory2,
    color: 'teal',
  },
];
