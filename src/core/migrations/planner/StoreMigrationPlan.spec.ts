import type { RootState } from '@/core/zustand';
import { describe, expect, test } from 'vitest';
import { storeMigrationV2 } from '@/core/migrations/v2';
import { migrateStoreWithPlan } from './StoreMigrationPlan';

describe('StoreMigrationPlan', () => {
  test('should migrate factories and game version', () => {
    const state: Pick<RootState, 'factories' | 'games'> = {
      factories: {
        factories: {
          abc: {
            id: 'abc',
            outputs: [],
            inputs: [{ forceUsage: true }],
          },
        },
      },
      games: {
        selected: 'test',
        games: {
          test: {
            id: 'test',
            name: 'Test',
            settings: {},
            factoriesIds: ['abc'],
          },
        },
      },
    };

    const nextState = migrateStoreWithPlan(
      storeMigrationV2,
      state as RootState,
    );
    const factory = nextState.factories.factories.abc;
    expect(factory.inputs[0].constraint).toBe('exact');
    expect(factory.inputs[0].forceUsage).toBeUndefined();

    const game = nextState.games.games.test;
    expect(game.version).toBe(2);
  });
});
