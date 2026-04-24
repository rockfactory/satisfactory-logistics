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

/**
 * A "raw output" — represents a portion of this factory's output that flows
 * to a downstream consumer factory. Mirrors `SolverRawInputNode` but on the
 * output side. Created by scanning other factories' inputs that reference
 * this factory's id and resource.
 */
export type SolverRawOutputNode = {
  type: 'raw_output';
  label: string;
  resource: FactoryItem;
  variable: string;
  output?: FactoryOutput;
  outputIndex?: number;
  consumerFactoryId: string;
  consumerFactoryName?: string | null;
  consumerInputIndex: number;
  consumerAmount: number;
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
  | SolverRawOutputNode
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
