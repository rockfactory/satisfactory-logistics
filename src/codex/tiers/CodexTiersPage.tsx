import {
  Badge,
  Container,
  Group,
  Image,
  Paper,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import classes from './CodexTiersPage.module.css';
import { type TierGroup, TierGroups, TierTotals } from './tierUnlocks';

export function CodexTiersPage() {
  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={2}>Tiers</Title>
          <Text c="dimmed" size="sm">
            HUB progression: {TierTotals.tiers} tiers, {TierTotals.milestones}{' '}
            milestones, {TierTotals.recipes} recipes, {TierTotals.buildings}{' '}
            buildings, {TierTotals.equipment} equipment.
          </Text>
        </Stack>

        <Stack gap="sm">
          {TierGroups.map(group => (
            <TierRow key={group.tier} group={group} />
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}

function TierRow({ group }: { group: TierGroup }) {
  const recipeCount = group.recipeCount;
  const buildingCount = group.buildingCount;
  const itemCount = group.newItemCount;
  const equipmentCount = group.equipmentCount;

  const allBuildings = group.milestones.flatMap(m => m.buildings);
  const allNewItems = group.milestones.flatMap(m => m.newItems);
  const allEquipment = group.milestones.flatMap(m => m.equipment);
  const allOtherUnlocks = group.milestones.flatMap(m => m.otherUnlocks);
  const hasIcons =
    allBuildings.length + allNewItems.length + allEquipment.length > 0;
  const hasOther = allOtherUnlocks.length > 0;

  return (
    <Paper
      id={`tier-${group.tier}`}
      component={Link}
      to={`/codex/tiers/${group.tier}`}
      withBorder
      radius="md"
      className={classes.tierRow}
    >
      <div className={classes.stripe}>
        <div className={classes.stripeBadge}>
          <span className={classes.stripeBadgeKicker}>Tier</span>
          <span className={classes.stripeBadgeNumber}>{group.tier}</span>
        </div>
      </div>

      <div className={classes.body}>
        <div className={classes.headerRow}>
          <div className={classes.milestoneNames}>
            {group.schematics.map(s => (
              <Badge key={s.id} variant="light" color="blue" size="sm">
                {s.name}
              </Badge>
            ))}
          </div>
          <IconChevronRight
            size={18}
            color="var(--mantine-color-dimmed)"
            style={{ flexShrink: 0 }}
          />
        </div>

        <div className={classes.summaryLine}>
          <SummaryStat label="milestones" value={group.milestones.length} />
          <span className={classes.summaryDot} />
          <SummaryStat label="recipes" value={recipeCount} />
          <span className={classes.summaryDot} />
          <SummaryStat label="buildings" value={buildingCount} />
          <span className={classes.summaryDot} />
          <SummaryStat label="new items" value={itemCount} />
          {equipmentCount > 0 && (
            <>
              <span className={classes.summaryDot} />
              <SummaryStat label="equipment" value={equipmentCount} />
            </>
          )}
        </div>

        {hasIcons || hasOther ? (
          <div className={classes.iconStrip}>
            {allBuildings.map(b => (
              <Tooltip key={b.id} label={b.name} withArrow openDelay={250}>
                <Image
                  w={20}
                  h={20}
                  fit="contain"
                  src={b.imagePath?.replace('_256', '_64')}
                  alt={b.name}
                />
              </Tooltip>
            ))}
            {allBuildings.length > 0 &&
              allNewItems.length + allEquipment.length > 0 && <IconDivider />}
            {allNewItems.map(i => (
              <FactoryItemImage key={i.id} id={i.id} size={20} withTooltip />
            ))}
            {allNewItems.length > 0 && allEquipment.length > 0 && (
              <IconDivider />
            )}
            {allEquipment.map(e => (
              <Tooltip key={e.script} label={e.name} withArrow openDelay={250}>
                <Image
                  w={20}
                  h={20}
                  fit="contain"
                  src={e.imagePath?.replace('_256', '_64')}
                  alt={e.name}
                />
              </Tooltip>
            ))}
            {hasIcons && hasOther && <IconDivider />}
            {allOtherUnlocks.map(other => (
              <Badge
                key={other.script}
                variant="light"
                color="gray"
                size="sm"
                title={other.script}
              >
                {other.name}
              </Badge>
            ))}
          </div>
        ) : (
          <Text className={classes.emptyHint}>No tracked unlocks</Text>
        )}
      </div>
    </Paper>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <Group gap={4} wrap="nowrap">
      <Text size="xs" fw={700}>
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Group>
  );
}

function IconDivider() {
  return (
    <span
      style={{
        width: 1,
        height: 16,
        backgroundColor: 'var(--mantine-color-default-border)',
        margin: '0 4px',
      }}
    />
  );
}
