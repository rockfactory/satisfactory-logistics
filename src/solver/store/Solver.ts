import short from 'short-uuid';

export interface SolverRequest {
  allowedRecipes?: string[] | null;
  blockedResources?: string[] | null;
  /** Limits how many raw resources can be used */
  resourcesAmount?: Record<string, number>;
  blockedBuildings?: string[] | null;
  objective?: 'minimize_power' | 'minimize_resources' | 'minimize_area';
}

export interface SolverNodeState {
  done?: boolean;
  somersloops?: number;
  amplification?: number;
  overclock?: number;
  layoutIgnoreEdges?: boolean;
}

export interface SolverInstance {
  /**
   * Equals to the factory ID if it's a factory
   */
  id: string;
  sharedId?: string;
  remoteSharedId?: string; // ID when loading from remote
  isOwner?: boolean;
  isFactory?: boolean;
  request: SolverRequest;
  nodes?: Record<string, SolverNodeState>;
  solution?: any; // TODO type this
}

export const sharedSolverUUIDTranslator = short();
