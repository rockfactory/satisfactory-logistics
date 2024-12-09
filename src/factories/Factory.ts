import type { LogisticType } from '@/recipes/logistics/LogisticTypes';

export type FactoryProgressStatus =
  | 'draft'
  | 'todo'
  | 'in_progress'
  | 'done';

export interface Factory {
  id: string;
  name?: string;
  description?: string;
  inputs: FactoryInput[];
  outputs: FactoryOutput[];
  powerConsumption?: number;
  progress?: FactoryProgressStatus;
  boardIndex?: number;
}

export interface FactoryInput {
  factoryId?: string | null;
  resource?: string | null;
  amount?: number | null;
  note?: string | null;
  transport?: LogisticType | null;
  /** @deprecated See constraint = 'exact' */
  forceUsage?: boolean;
  constraint?: FactoryInputConstraint;
}

export type FactoryInputConstraint =
  | 'input' // Limit solver to use at least this amount + allow solver to allocate extra world resources
  | 'exact' // Force solver to use this input in exact amount (ex "force usage")
  | 'max'; // Limit solver to use at most this amount

export interface FactoryOutput {
  resource: string | null;
  amount: number | null;
  somersloops?: number | null;
  objective?: FactoryOutputObjective;
}

export type FactoryOutputObjective = 'default' | 'max';

interface FactoriesSettings {
  noHighlight100PercentUsage?: boolean;
  highlight100PercentColor?: string;
}

export const WORLD_SOURCE_ID = 'WORLD';
