import type { RootState } from '@/core/zustand';
import type { Factory } from '@/factories/Factory';
import type { Game } from '@/games/Game';
import type { SerializedGame } from '@/games/store/gameFactoriesActions';
import type { SolverInstance } from '@/solver/store/Solver';
import { produce, type WritableDraft } from 'immer';

export interface StoreMigrationPlan {
  version: number;
  factory?: (factory: WritableDraft<Factory>) => void;
  solver?: (solver: WritableDraft<SolverInstance>) => void;
  game?: (game: WritableDraft<Game>) => void;
}

export function migrateStoreWithPlan(
  plan: StoreMigrationPlan,
  state: RootState,
) {
  return produce(state, draft => {
    if (plan.factory) {
      Object.values(draft.factories.factories ?? {}).forEach(factory => {
        plan.factory!(factory);
      });
    }
    if (plan.solver) {
      Object.values(draft.solvers.instances ?? {}).forEach(solver => {
        plan.solver!(solver);
      });
    }
    Object.values(draft.games.games ?? {}).forEach(game => {
      if (plan.game) {
        plan.game!(game);
      }
      game.version = plan.version;
    });
  });
}

export function migrateSerializedGameWithPlan(
  plan: StoreMigrationPlan,
  serialized: SerializedGame,
) {
  return produce(serialized, draft => {
    if (plan.factory) {
      draft.factories?.forEach(factory => {
        plan.factory!(factory);
      });
    }
    if (plan.solver) {
      draft.solvers?.forEach(solver => {
        plan.solver!(solver);
      });
    }
    if (plan.game) {
      plan.game!(draft.game);
    }
    draft.game.version = plan.version;
  });
}
