import type { StoreMigrationPlan } from './planner/StoreMigrationPlan';

export const storeMigrationV2: StoreMigrationPlan = {
  version: 2,
  factory(factory) {
    factory.inputs?.forEach(input => {
      if (input.forceUsage) {
        input.constraint = 'exact';
        delete input.forceUsage;
      }
    });
  },
} as const;
