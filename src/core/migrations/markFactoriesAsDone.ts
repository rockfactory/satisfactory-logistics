import type { RootState } from '@/core/zustand';
import { produce } from 'immer';

export function markFactoriesAsDone(state: RootState) {
  return produce(state, draft => {
    draft.updateFactories(factory => {
      factory.progress = factory.progress ?? 'done';
    });
  });
}
