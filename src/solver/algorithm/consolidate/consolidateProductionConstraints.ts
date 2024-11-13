import { log } from '@/core/logger/log';
import type { SolverContext } from '@/solver/algorithm/SolverContext';
import type { SolverResourceNode } from '@/solver/algorithm/SolverNode';
import { isLinkBetweenPackagerAndUnpackager } from './isLinkBetweenPackagerAndUnpackager';

const logger = log.getLogger('recipes:solver');
logger.setLevel('info');

export function consolidateProductionConstraints(ctx: SolverContext) {
  const resourceNodes = ctx.graph.filterNodes(
    (node, attributes) => attributes.type === 'resource',
  );
  // Resource nodes mixing recipe outputs to all ingredients
  for (const nodeName of resourceNodes) {
    const node = ctx.graph.getNodeAttributes(nodeName) as SolverResourceNode;
    const producers = ctx.graph.inboundNeighbors(nodeName);
    const consumers = ctx.graph.outboundNeighbors(nodeName);

    if (producers.length > 0) {
      ctx.constraints.push(
        `${producers.join(' + ')} - p${node.resource.index} = 0`,
      );
    } else {
      logger.debug('No producers for', node.resource);
      // If there are no producers, we need to set the production to 0
      ctx.bounds.push(`p${node.resource.index} = 0`);
      ctx.bounds.push(`b${node.resource.index} = 0`);
    }

    // Even if there are no consumers, we still need to add the constraint
    // to handle output (byproduct) resources
    ctx.constraints.push(
      `p${node.resource.index} ${consumers.length > 0 ? ' - ' + consumers.join(' - ') : ''} - b${node.resource.index} = 0`,
    );

    for (const inboundVar of producers) {
      const inbound = ctx.graph.getNodeAttributes(inboundVar);
      if (
        inbound.type !== 'output' &&
        inbound.type !== 'raw' &&
        inbound.type !== 'raw_input'
      ) {
        logger.error('Invalid inbound node type', inbound, node);
        throw new Error('Invalid inbound node type');
      }

      for (const outboundVar of consumers) {
        const outbound = ctx.graph.getNodeAttributes(outboundVar);
        if (outbound.type !== 'input') {
          logger.error('Invalid outbound node type', outbound, node);
          throw new Error('Invalid outbound node type');
        }

        if (isLinkBetweenPackagerAndUnpackager(inbound, outbound)) {
          logger.debug('Avoiding packager link', inbound, outbound);
          continue;
        }

        const [edge, inserted] = ctx.graph.mergeEdgeWithKey(
          ctx.encodeVar(`l_${inboundVar}_${outboundVar}`),
          inboundVar,
          outboundVar,
          {
            type: 'link',
            resource: node.resource,
            source: inbound.type === 'output' ? inbound.recipe : 'world',
            target: outbound.recipe,
            variable: ctx.encodeVar(`l_${inboundVar}_${outboundVar}`),
            label: `Link: ${inbound.label} -> ${outbound.label}`,
          },
        );
      }
    }

    // From producer P to ingredients I1, I2, I3
    for (const producerVar of producers) {
      const producer = ctx.graph.getNodeAttributes(producerVar);

      const byproductVar =
        producer.type === 'output' ? producer.byproductVariable : null;

      const allowedConsumers = consumers.filter(c => {
        return ctx.graph.hasEdge(producerVar, c);
      });

      ctx.constraints.push(
        `${producerVar} ${allowedConsumers.length === 0 ? '' : ' - ' + allowedConsumers.map(consumerVar => ctx.encodeVar(`l_${producerVar}_${consumerVar}`)).join(' - ')} ${byproductVar ? `- ${byproductVar}` : ''} = 0`,
      );
    }

    // From producers P1, P2, P3 to consumer C
    for (const consumerVar of consumers) {
      const allowedProducers = producers.filter(p => {
        return ctx.graph.hasEdge(p, consumerVar);
      });

      if (allowedProducers.length === 0) {
        ctx.constraints.push(`${consumerVar} = 0`);
        continue;
      }

      const consumer = ctx.graph.getNodeAttributes(consumerVar);
      ctx.constraints.push(
        `PROD_CONS_${consumerVar}: ${consumerVar} - ${allowedProducers.map(producerVar => ctx.encodeVar(`l_${producerVar}_${consumerVar}`)).join(' - ')} = 0`,
      );
    }
  }

  // Byproducts
  const byproductNodes = ctx.graph.filterNodes(
    (node, attributes) => attributes.type === 'byproduct',
  );
  for (const nodeName of byproductNodes) {
    const node = ctx.graph.getNodeAttributes(nodeName);
    // Es. `b${productItem.index}r${recipe.index}`
    const byproductEdges = ctx.graph.inboundEdges(nodeName);
    if (byproductEdges.length > 0) {
      ctx.constraints.push(
        `${node.variable} - ${byproductEdges.join(' - ')} = 0`,
      );
    } else {
      // TODO Verify
      logger.warn('Byproduct without producers', node);
      ctx.bounds.push(`${node.variable} = 0`);
    }
  }
}
