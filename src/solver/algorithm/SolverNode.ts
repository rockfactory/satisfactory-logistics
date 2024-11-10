import type { FactoryInput, FactoryOutput } from '@/factories/Factory';
import type { FactoryItem } from '@/recipes/FactoryItem';
import type { FactoryRecipe } from '@/recipes/FactoryRecipe';

export type SolverResourceNode = {
  type: 'resource';
  label: string;
  resource: FactoryItem;
  variable: string;
};

/**
 * A World resource, like water, coal, etc.
 * Factory inputs (even for world resources) are represented
 * as `raw_input` nodes instead.
 */
export type SolverRawNode = {
  type: 'raw';
  label: string;
  resource: FactoryItem;
  variable: string;
};

export type SolverRawInputNode = {
  type: 'raw_input';
  label: string;
  resource: FactoryItem;
  variable: string;
  input?: FactoryInput;
  inputIndex?: number;
};

export type SolverOutputNode = {
  type: 'output';
  label: string;
  recipe: FactoryRecipe;
  recipeMainProductVariable: string;
  resource: FactoryItem;
  variable: string;
  amplifiedVariable: string;
  originalVariable: string;
  byproductVariable: string;
};

export type SolverByproductNode = {
  type: 'byproduct';
  label: string;
  resource: FactoryItem;
  variable: string;
  /**
   * If the byproduct is required by the user, we store it here.
   * This is further used to set maximization objectives.
   */
  output?: FactoryOutput;
  outputIndex?: number;
};

export type SolverInputNode = {
  type: 'input';
  label: string;
  recipe: FactoryRecipe;
  recipeMainProductVariable: string;
  resource: FactoryItem;
  variable: string;
};

export type SolverEnergyNode = {
  type: 'energy';
  label: string;
  recipe: FactoryRecipe;
  variable: string;
  // Only after solving
  value?: number;
};

export type SolverAreaNode = {
  type: 'area';
  variable: string;
  // Only after solving
  value?: number;
};

export type SolverNode =
  | SolverRawNode
  | SolverRawInputNode
  | SolverOutputNode
  | SolverByproductNode
  | SolverInputNode
  | SolverResourceNode
  | SolverEnergyNode
  | SolverAreaNode;

export type SolverEdge = {
  type: 'link';
  resource: FactoryItem;
  source: FactoryRecipe | 'world';
  target: FactoryRecipe;
  variable: string;
  label: string;
};
