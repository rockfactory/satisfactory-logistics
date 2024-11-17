import type { IByproductNodeData } from '@/solver/layout/nodes/byproduct-node/ByproductNode';
import type { IMachineNodeData } from '@/solver/layout/nodes/machine-node/MachineNode';
import type { IResourceNodeData } from '@/solver/layout/nodes/resource-node/ResourceNode';
import type { Node } from '@xyflow/react';
import type { SolutionNode } from './solveProduction';

export function isResourceNode(
  node: SolutionNode,
): node is Node<IResourceNodeData, 'Resource'> {
  return node.type === 'Resource';
}

export function isMachineNode(
  node: SolutionNode,
): node is Node<IMachineNodeData, 'Machine'> {
  return node.type === 'Machine';
}

export function isByproductNode(
  node: SolutionNode,
): node is Node<IByproductNodeData, 'Byproduct'> {
  return node.type === 'Byproduct';
}
