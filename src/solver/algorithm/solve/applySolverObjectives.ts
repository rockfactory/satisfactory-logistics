import { log } from '@/core/logger/log';
import { getWorldResourceMax } from '@/recipes/WorldResources';
import type { SolverProductionRequest } from '../solveProduction';
import type { SolverContext } from '../SolverContext';

const logger = log.getLogger('solver:production');
logger.setLevel('info');

export function applySolverObjective(
  ctx: SolverContext,
  request: SolverProductionRequest,
) {
  switch (request.objective) {
    case 'minimize_power':
      /** MINIMIZE */
      ctx.objective = `${Array.from(ctx.getEnergyVars())
        .map(v => v.variable)
        .join(' + ')}`;
      break;

    case 'minimize_area':
      /** MINIMIZE */
      ctx.objective = `${Array.from(ctx.getAreaVars())
        .map(v => v.variable)
        .join(' + ')}`;
      break;

    case 'minimize_resources':
    default:
      /** MINIMIZE */
      ctx.objective = `${Array.from(ctx.getWorldVars())
        .map(
          v =>
            `${1 / getWorldResourceMax(v.resource.id, 'weight')} r${v.resource.index}`,
        )
        .join(' + ')}`;

    // const inputs = ctx.getWorldInputVars();
    // if (inputs.some(v => v.resource.id === 'Desc_SAMIngot_C')) {
    //   ctx.objective += ` + 0.0001 r${inputs.find(v => v.resource.id === 'Desc_SAMIngot_C')?.resource.index}`;
    // }
  }

  // Maximize the output
  const maximizedOutputs = ctx.getMaximizedOutputs();
  if (maximizedOutputs.length > 0) {
    logger.log('Maximized outputs:', maximizedOutputs);
    ctx.objective += ` - ${maximizedOutputs
      .map(v => `${v.variable}`)
      .join(' - ')}`;
  }

  ctx.objective += '\n';
}
