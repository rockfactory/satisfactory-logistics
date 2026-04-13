import type { Edge } from '@xyflow/react';
import type Graph from 'graphology';
import type { HighsSolution } from 'highs';
import type { SolverContext } from '@/solver/algorithm/SolverContext';
import type { SolverEdge, SolverNode } from '@/solver/algorithm/SolverNode';
import type { SolutionNode } from '@/solver/algorithm/solveProduction';

export interface ISolverSolution {
  result: HighsSolution;
  nodes: SolutionNode[];
  edges: Edge[];
  graph: Graph<SolverNode, SolverEdge, any>;
  context: SolverContext;
}
