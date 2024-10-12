export interface Factory {
  id: string;
  name?: string | null;
  description?: string | null;
  inputs: FactoryInput[];
  outputs: FactoryOutput[];
  powerConsumption?: number | null;
  // TODO currently planned but it should be equal to the factory ID. Not present in migrations
  // TODO if we remove the solver, this doesn't get updated
  solverId?: string;
}

export interface FactoryInput {
  factoryId?: string | null;
  resource?: string | null;
  amount?: number | null;
  note?: string | null;
}

export interface FactoryOutput {
  resource: string | null;
  amount: number | null;
  somersloops?: number | null;
}

interface FactoriesSettings {
  noHighlight100PercentUsage?: boolean;
  highlight100PercentColor?: string;
}

export const WORLD_SOURCE_ID = 'WORLD';
