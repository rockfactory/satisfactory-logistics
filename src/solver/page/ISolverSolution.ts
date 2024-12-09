// TODO Move in dedicated file
import { HighsSolution } from 'highs';
import type { SolutionNode } from '@/solver/algorithm/solveProduction';
import { Edge } from '@xyflow/react';
import Graph from 'graphology';
import type { SolverEdge, SolverNode } from '@/solver/algorithm/SolverNode';
import type { SolverContext } from '@/solver/algorithm/SolverContext';

export interface ISolverSolution {
  result: HighsSolution;
  nodes: SolutionNode[];
  edges: Edge[];
  graph: Graph<SolverNode, SolverEdge, any>;
  context: SolverContext;
}
