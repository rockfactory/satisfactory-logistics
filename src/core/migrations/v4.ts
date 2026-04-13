import type { StoreMigrationPlan } from './planner/StoreMigrationPlan';

export const storeMigrationV4: StoreMigrationPlan = {
  version: 4,
  factory(factory) {
    factory.progress = factory.progress ?? 'done';
  },
} as const;
