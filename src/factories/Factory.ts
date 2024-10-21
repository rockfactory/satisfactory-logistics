export interface Factory {
  id: string;
  name?: string | null;
  description?: string | null;
  inputs: FactoryInput[];
  outputs: FactoryOutput[];
  powerConsumption?: number | null;
}

export interface FactoryInput {
  factoryId?: string | null;
  resource?: string | null;
  amount?: number | null;
  note?: string | null;
  /** Force usage in calculator. Eventual surplus will be converted in byproduct */
  forceUsage?: boolean;
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
