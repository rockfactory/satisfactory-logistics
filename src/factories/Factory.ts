export interface Factory {
  id: string;
  name?: string | null;
  description?: string | null;
  inputs?: FactoryInput[];
  outputs?: FactoryOutput[];
  powerConsumption?: number | null;
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

interface FactoriesFilters {
  name: string | null;
  resource: string | null;
  viewMode?: 'compact' | 'wide';
}

interface FactoriesSettings {
  noHighlight100PercentUsage?: boolean;
  highlight100PercentColor?: string;
}
