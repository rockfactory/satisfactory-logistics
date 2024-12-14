import { log } from '@/core/logger/log';
import { getWorldResourceMax, isWorldResource } from '@/recipes/WorldResources';
import type { SolverProductionRequest } from '@/solver/algorithm/solveProduction';
import type { SolverContext } from '@/solver/algorithm/SolverContext';

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

      // The FICSMAS fix! If there are no raw inputs, we need to minimize all inputs
      // since there's nothing else to minimize.
      if (ctx.getWorldVars().length === 0) {
        ctx.objective = `${inputs
          .filter(v => !isWorldResource(v.resource.id))
          .map(v => {
            const inputResourceWeight = 1_000_000;
            return `${1 / inputResourceWeight} ${v.variable}`;
          })
          .join(' + ')}`;
      }

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

    if (maximizedOutputs.length > 1) {
      for (let i = 1; i < maximizedOutputs.length; i++) {
        ctx.constraints.push(
          `OUTPUT_MAX_${i}: ${maximizedOutputs[i].variable} - ${maximizedOutputs[0].variable} = 0`,
        );
      }
    }
  }

  // Add custom minimization vars
  ctx.objective += ctx.getMinimizeExpressionsObjective();

  ctx.objective += '\n';
}
