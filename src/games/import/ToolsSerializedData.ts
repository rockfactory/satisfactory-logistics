interface Metadata {
  name?: string | null;
  icon?: string | null;
  schemaVersion?: number;
  gameVersion?: string;
}

interface Production {
  item?: string;
  type?: string;
  amount?: number;
  ratio?: number;
}

interface Input {
  item?: string;
  amount?: number;
}

interface ResourceMax {
  [key: string]: number;
}

interface ResourceWeight {
  [key: string]: number;
}

interface Request {
  allowedAlternateRecipes?: string[];
  blockedRecipes?: string[];
  blockedMachines?: string[];
  blockedResources?: string[];
  sinkableResources?: any[];
  production?: Production[];
  input?: Input[];
  resourceMax?: ResourceMax;
  resourceWeight?: ResourceWeight;
}

export interface ToolsSerializedTab {
  metadata?: Metadata;
  request?: Request;
}

export interface ToolsSerializedData {
  type?: string;
  tabs?: ToolsSerializedTab[];
}
