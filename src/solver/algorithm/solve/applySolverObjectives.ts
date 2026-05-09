import { log } from '@/core/logger/log';
import { getWorldResourceMax, isWorldResource } from '@/recipes/WorldResources';
import type { SolverContext } from '@/solver/algorithm/SolverContext';
import type { SolverProductionRequest } from '@/solver/algorithm/solveProduction';

const logger = log.getLogger('solver:production');
logger.setLevel('info');

/** Weight bonus for world resources, slightly penalizes extraction vs factory inputs */
const WORLD_RESOURCE_WEIGHT_OFFSET = 100;
/**
 * Base weight for non-world factory inputs. The cost coefficient on a declared
 * input variable is `1 / FACTORY_INPUT_BASE_WEIGHT` and must be smaller than
 * the marginal recipe-based production cost of any item, so that the solver
 * always prefers consuming the declared input over producing it from raw
 * resources. The pure cost-of-production threshold is ~1e-6 (Iron Screw via
 * raw, the cheapest item in the game), but in practice HIGHS numerical
 * tolerance swallows differences below ~1e-9 when other objective terms are
 * larger, so the safe threshold is ~1e10. 1e10 was empirically validated
 * against a Heavy Modular Frame factory with 6 declared inputs where 1e9 still
 * leaked ~30/min of raw Wire production despite available declared Wire.
 */
const FACTORY_INPUT_BASE_WEIGHT = 10_000_000_000;

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

      const inputs = ctx.getWorldInputVars();
      if (inputs.length > 0) {
        ctx.objective += ` + ${inputs
          .map(v => {
            const isWorld = isWorldResource(v.resource.id);
            // World resources use their global availability as weight.
            // Non-world factory inputs use a uniform weight slightly
            // cheaper than world resources, so the solver prefers them
            // equally and minimizes total factory input consumption.
            const inputResourceWeight = isWorld
              ? getWorldResourceMax(v.resource.id, 'weight') +
                WORLD_RESOURCE_WEIGHT_OFFSET
              : FACTORY_INPUT_BASE_WEIGHT;

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
