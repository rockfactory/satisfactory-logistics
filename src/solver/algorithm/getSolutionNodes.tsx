import type { Node } from '@xyflow/react';
import type { IByproductNodeData } from '@/solver/layout/nodes/byproduct-node/ByproductNode';
import type { IMachineNodeData } from '@/solver/layout/nodes/machine-node/MachineNode';
import type { IOutputConsumerNodeData } from '@/solver/layout/nodes/output-consumer-node/OutputConsumerNode';
import type { IResourceNodeData } from '@/solver/layout/nodes/resource-node/ResourceNode';
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

export function isOutputConsumerNode(
  node: SolutionNode,
): node is Node<IOutputConsumerNodeData, 'OutputConsumer'> {
  return node.type === 'OutputConsumer';
}
