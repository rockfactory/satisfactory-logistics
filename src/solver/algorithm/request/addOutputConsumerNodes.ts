import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { type SolverContext } from '@/solver/algorithm/SolverContext';
import type { FactoryOutputConsumer } from '@/solver/algorithm/solveProduction';

/**
 * Stable React Flow node id for an "output to consumer factory" entry.
 *
 * Kept stable across solves so the layout system can preserve positions
 * (matches the pattern used for raw / raw_input variables).
 */
export function getOutputConsumerNodeId(
  consumer: FactoryOutputConsumer,
  consumerIndex: number,
) {
  const item = AllFactoryItemsMap[consumer.resource];
  const outputIndexPart = consumer.outputIndex ?? 'x';
  return `ro${item.index}o${outputIndexPart}c${consumerIndex}`;
}

/**
 * Records the consumer in the LP graph as a `raw_output` node so the
 * result walker can later discover and emit a React Flow node + edge for
 * it. We deliberately do NOT add an LP edge or constraint here:
 *
 * - These nodes are pure display markers — they show how much of the
 *   producer's existing output goes to a specific consumer factory. The
 *   amount is already accounted for by the consumer's own input flow.
 * - Adding them as additional consumers of the resource node would
 *   double-count the demand (once via the existing byproduct/output
 *   constraint, once via this extra consumer), causing infeasibility
 *   when the consumer claim overlaps with the producer's declared
 *   output amount.
 */
export function addOutputConsumerNode(
  ctx: SolverContext,
  consumer: FactoryOutputConsumer,
  consumerIndex: number,
) {
  const { resource, output, outputIndex, amount } = consumer;
  const resourceItem = AllFactoryItemsMap[resource];
  const nodeId = getOutputConsumerNodeId(consumer, consumerIndex);

  ctx.graph.mergeNode(nodeId, {
    type: 'raw_output',
    label: resource,
    resource: resourceItem,
    variable: nodeId,
    output,
    outputIndex,
    consumerFactoryId: consumer.consumerFactoryId,
    consumerFactoryName: consumer.consumerFactoryName,
    consumerInputIndex: consumer.consumerInputIndex,
    consumerAmount: amount,
  });
}
