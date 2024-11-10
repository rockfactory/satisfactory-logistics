import { log } from '@/core/logger/log';
import { getWorldResourceMax, isWorldResource } from '@/recipes/WorldResources';
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
    default: {
      /** MINIMIZE */
      ctx.objective = `${Array.from(ctx.getWorldVars())
        .map(
          v =>
            `${1 / getWorldResourceMax(v.resource.id, 'weight')} r${v.resource.index}`,
        )
        .join(' + ')}`;

      // World inputs should be minimized too.
      // For now, we are only considering _WORLD_ resources
      const inputs = ctx.getWorldInputVars();
      const worldInputs = inputs.filter(v => isWorldResource(v.resource.id));
      if (worldInputs.length > 0) {
        ctx.objective += ` + ${worldInputs
          .map(v => {
            // We make it _slightly_ more favorable to use Inputs
            // than world resources. This way, the solver will try to
            // use inputs first.
            const inputResourceWeight =
              getWorldResourceMax(v.resource.id, 'weight') + 100;

            return `${1 / inputResourceWeight} ${v.variable}`;
          })
          .join(' + ')}`;
      }
    }
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
