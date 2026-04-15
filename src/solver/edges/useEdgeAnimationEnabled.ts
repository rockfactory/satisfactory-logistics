import { useReducedMotion } from '@mantine/hooks';
import { useGameSetting } from '@/games/gamesSlice';

export function useEdgeAnimationEnabled(): boolean {
  const disabled = useGameSetting('disableEdgeAnimation') as
    | boolean
    | undefined;
  const reducedMotion = useReducedMotion();
  return !disabled && !reducedMotion;
}
