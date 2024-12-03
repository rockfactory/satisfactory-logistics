import { loglev } from '@/core/logger/log';
import type { FactoryInput } from '@/factories/Factory';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import type { SolverContext } from '@/solver/algorithm/SolverContext';
import { groupBy } from 'lodash';

const logger = loglev.getLogger('solver:block-world-resources-for-inputs');

export function blockWorldResourcesForInputs(
  ctx: SolverContext,
  inputs: FactoryInput[],
) {
  const groupedByResource = groupBy(inputs, 'resource');
  for (const resource in groupedByResource) {
    const resourceItem = AllFactoryItemsMap[resource ?? ''];
    if (!resourceItem) {
      logger.error('Resource not found', resource);
      continue;
    }

    const shouldBlock = groupedByResource[resource].some(
      input => (input.constraint ?? 'max') === 'max',
    );
    if (!shouldBlock) continue;

    const resourceTotalAmount = groupedByResource[resource].reduce(
      (acc, input) => acc + (input.amount ?? 0),
      0,
    );

    logger.debug('Blocking resource', resource, resourceTotalAmount);
    ctx.constraints.push(`r${resourceItem.index} = 0`);
  }
}
