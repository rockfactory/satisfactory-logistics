import { Group, Paper, Tooltip, UnstyledButton } from '@mantine/core';
import { Link } from 'react-router-dom';

import classes from './TierRail.module.css';
import { TierGroups } from './tierUnlocks';

export interface ITierRailProps {
  /** The tier currently being viewed, if any. Highlighted in the rail. */
  activeTier?: number;
}

/**
 * Sticky horizontal strip of `T0 T1 T2…` chips. Used on the tier
 * detail page to jump between tiers without going back to the
 * overview. Each chip is a router link to `/codex/tiers/<n>` and the
 * active one is visually highlighted.
 */
export function TierRail({ activeTier }: ITierRailProps) {
  return (
    <Paper withBorder radius="md" p={6} className={classes.rail}>
      <Group gap={4} wrap="nowrap" className={classes.scroller}>
        {TierGroups.map(group => {
          const isActive = activeTier === group.tier;
          const label = `Tier ${group.tier}`;
          const subtitle = `${group.milestones.length} milestone${
            group.milestones.length === 1 ? '' : 's'
          }`;
          const className = isActive
            ? `${classes.chip} ${classes.chipActive}`
            : classes.chip;

          return (
            <Tooltip
              key={group.tier}
              label={subtitle}
              withArrow
              openDelay={250}
            >
              <UnstyledButton
                component={Link}
                to={`/codex/tiers/${group.tier}`}
                className={className}
                aria-label={label}
              >
                T{group.tier}
              </UnstyledButton>
            </Tooltip>
          );
        })}
      </Group>
    </Paper>
  );
}
