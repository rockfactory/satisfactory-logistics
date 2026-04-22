import {
  ActionIcon,
  Anchor,
  Badge,
  Container,
  Group,
  Image,
  NavLink,
  Paper,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconArrowLeft, IconArrowRight, IconCoin } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { SectionCard } from '../components/StatCard';
import classes from './CodexTierDetail.module.css';
import { TierRail } from './TierRail';
import {
  type MilestoneUnlocks,
  TierGroups,
  TierGroupsMap,
} from './tierUnlocks';

export function CodexTierDetail() {
  const { tier } = useParams<{ tier: string }>();
  const tierNum = tier != null ? parseInt(tier, 10) : NaN;
  const group = Number.isFinite(tierNum) ? TierGroupsMap[tierNum] : undefined;

  const tierIndex = useMemo(
    () => (group ? TierGroups.findIndex(g => g.tier === group.tier) : -1),
    [group],
  );
  const prev = tierIndex > 0 ? TierGroups[tierIndex - 1] : undefined;
  const next =
    tierIndex >= 0 && tierIndex < TierGroups.length - 1
      ? TierGroups[tierIndex + 1]
      : undefined;

  const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (group?.milestones[0]) {
      setActiveMilestoneId(group.milestones[0].schematic.id);
    }
  }, [group]);

  if (!group) return <Navigate to="/codex/tiers" replace />;

  const activeMilestone =
    group.milestones.find(m => m.schematic.id === activeMilestoneId) ??
    group.milestones[0];

  return (
    <Container size="lg" py="xl">
      <Stack gap="md">
        <Anchor component={Link} to="/codex/tiers" size="sm">
          <Group gap={4}>
            <IconArrowLeft size={14} />
            Back to Tiers
          </Group>
        </Anchor>

        <TierRail activeTier={group.tier} />

        <Paper withBorder radius="md" className={classes.header}>
          <div className={classes.headerStripe}>
            <div>
              <div className={classes.headerStripeKicker}>Tier</div>
              <div className={classes.headerStripeNumber}>{group.tier}</div>
            </div>
          </div>
          <div className={classes.headerBody}>
            <Group gap="xs">
              {group.schematics.map(s => (
                <Badge key={s.id} variant="light" color="blue" size="md">
                  {s.name}
                </Badge>
              ))}
            </Group>
            <div className={classes.statRow}>
              <span>
                <strong>{group.milestones.length}</strong>milestones
              </span>
              <span className={classes.statDot} />
              <span>
                <strong>{group.recipeCount}</strong>recipes
              </span>
              <span className={classes.statDot} />
              <span>
                <strong>{group.buildingCount}</strong>buildings
              </span>
              <span className={classes.statDot} />
              <span>
                <strong>{group.newItemCount}</strong>new items
              </span>
            </div>
          </div>
          <div className={classes.headerNav}>
            {prev ? (
              <Tooltip label={`Tier ${prev.tier}`} withArrow openDelay={250}>
                <ActionIcon
                  component={Link}
                  to={`/codex/tiers/${prev.tier}`}
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label={`Previous tier (${prev.tier})`}
                >
                  <IconArrowLeft size={18} />
                </ActionIcon>
              </Tooltip>
            ) : (
              <ActionIcon variant="subtle" color="gray" size="lg" disabled>
                <IconArrowLeft size={18} />
              </ActionIcon>
            )}
            {next ? (
              <Tooltip label={`Tier ${next.tier}`} withArrow openDelay={250}>
                <ActionIcon
                  component={Link}
                  to={`/codex/tiers/${next.tier}`}
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label={`Next tier (${next.tier})`}
                >
                  <IconArrowRight size={18} />
                </ActionIcon>
              </Tooltip>
            ) : (
              <ActionIcon variant="subtle" color="gray" size="lg" disabled>
                <IconArrowRight size={18} />
              </ActionIcon>
            )}
          </div>
        </Paper>

        {group.milestones.length > 1 && (
          <div className={classes.mobileNav}>
            <SegmentedControl
              fullWidth
              value={activeMilestoneId ?? group.milestones[0].schematic.id}
              onChange={setActiveMilestoneId}
              data={group.milestones.map((m, idx) => ({
                value: m.schematic.id,
                label: `M${idx + 1}`,
              }))}
            />
          </div>
        )}

        <div className={classes.layout}>
          <div className={classes.desktopRail}>
            {group.milestones.length > 1 && (
              <Stack gap={2} className={classes.milestoneRail}>
                {group.milestones.map((m, idx) => {
                  const isActive =
                    m.schematic.id === activeMilestone?.schematic.id;
                  const totalUnlocks =
                    m.recipes.length +
                    m.buildings.length +
                    m.newItems.length +
                    m.equipment.length +
                    m.otherUnlocks.length;
                  return (
                    <NavLink
                      key={m.schematic.id}
                      label={m.schematic.name}
                      description={`Milestone ${idx + 1}`}
                      rightSection={
                        <Text size="xs" c="dimmed">
                          {totalUnlocks}
                        </Text>
                      }
                      active={isActive}
                      variant="light"
                      color="grape"
                      onClick={() => setActiveMilestoneId(m.schematic.id)}
                    />
                  );
                })}
              </Stack>
            )}
          </div>

          <div className={classes.contentColumn}>
            {activeMilestone && (
              <MilestoneSection
                milestone={activeMilestone}
                index={
                  group.milestones.findIndex(
                    m => m.schematic.id === activeMilestone.schematic.id,
                  ) + 1
                }
                showIndex={group.milestones.length > 1}
              />
            )}
          </div>
        </div>
      </Stack>
    </Container>
  );
}

function MilestoneSection({
  milestone,
  index,
  showIndex,
}: {
  milestone: MilestoneUnlocks;
  index: number;
  showIndex: boolean;
}) {
  const { schematic, recipes, buildings, newItems, equipment, otherUnlocks } =
    milestone;
  const description = schematic.description?.trim();

  return (
    <Stack gap="md">
      <div className={classes.milestoneTitleRow}>
        {showIndex && <span className={classes.milestoneIndex}>M{index}</span>}
        <Title order={3}>{schematic.name}</Title>
      </div>

      {description && (
        <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-line' }}>
          {description}
        </Text>
      )}

      {schematic.cost.length > 0 && (
        <SectionCard title="Cost to unlock">
          <Group gap="sm" wrap="wrap">
            {schematic.cost.map(cost => {
              const item = AllFactoryItemsMap[cost.resource];
              return (
                <Anchor
                  key={cost.resource}
                  component={Link}
                  to={`/codex/items/${cost.resource}`}
                  underline="never"
                >
                  <Paper withBorder p="xs" radius="sm">
                    <Group gap={8}>
                      <IconCoin
                        size={14}
                        color="var(--mantine-color-yellow-5)"
                      />
                      <FactoryItemImage
                        id={cost.resource}
                        size={28}
                        withTooltip
                      />
                      <Stack gap={0}>
                        <Text size="sm" fw={500}>
                          {item?.displayName ?? cost.resource}
                        </Text>
                        <Text size="xs" c="dimmed">
                          x{cost.amount.toLocaleString()}
                        </Text>
                      </Stack>
                    </Group>
                  </Paper>
                </Anchor>
              );
            })}
          </Group>
        </SectionCard>
      )}

      <div className={classes.unlockGrid}>
        {buildings.length > 0 && (
          <SectionCard title={`Buildings (${buildings.length})`}>
            <Stack gap={6}>
              {buildings.map(building => (
                <Anchor
                  key={building.id}
                  component={Link}
                  to={`/codex/buildings/${building.id}`}
                  underline="never"
                >
                  <Paper withBorder p="xs" radius="sm">
                    <Group gap={10} wrap="nowrap">
                      <Image
                        w={32}
                        h={32}
                        fit="contain"
                        src={building.imagePath?.replace('_256', '_64')}
                        alt={building.name}
                      />
                      <Text size="sm" fw={500} lineClamp={2}>
                        {building.name}
                      </Text>
                    </Group>
                  </Paper>
                </Anchor>
              ))}
            </Stack>
          </SectionCard>
        )}

        {newItems.length > 0 && (
          <SectionCard title={`New Items (${newItems.length})`}>
            <Stack gap={6}>
              {newItems.map(item => (
                <Anchor
                  key={item.id}
                  component={Link}
                  to={`/codex/items/${item.id}`}
                  underline="never"
                >
                  <Paper withBorder p="xs" radius="sm">
                    <Group gap={10} wrap="nowrap">
                      <FactoryItemImage id={item.id} size={28} withTooltip />
                      <Text size="sm" fw={500} lineClamp={1}>
                        {item.displayName}
                      </Text>
                    </Group>
                  </Paper>
                </Anchor>
              ))}
            </Stack>
          </SectionCard>
        )}

        {equipment.length > 0 && (
          <SectionCard title={`Equipment (${equipment.length})`}>
            <Stack gap={6}>
              {equipment.map(equip => (
                <Paper key={equip.script} withBorder p="xs" radius="sm">
                  <Group gap={10} wrap="nowrap" align="flex-start">
                    {equip.imagePath ? (
                      <Image
                        w={32}
                        h={32}
                        fit="contain"
                        src={equip.imagePath.replace('_256', '_64')}
                        alt={equip.name}
                      />
                    ) : (
                      <div style={{ width: 32, height: 32 }} />
                    )}
                    <Stack gap={2}>
                      <Text size="sm" fw={500} lineClamp={1}>
                        {equip.name}
                      </Text>
                      {equip.description && (
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {equip.description}
                        </Text>
                      )}
                    </Stack>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </SectionCard>
        )}
      </div>

      {recipes.length > 0 && (
        <SectionCard title={`Recipes (${recipes.length})`}>
          <Table striped highlightOnHover verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Recipe</Table.Th>
                <Table.Th>Ingredients</Table.Th>
                <Table.Th>Products</Table.Th>
                <Table.Th ta="right">Time (s)</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recipes.map(recipe => (
                <Table.Tr key={recipe.id}>
                  <Table.Td>
                    <Anchor
                      component={Link}
                      to={`/codex/recipes/${recipe.id}`}
                      size="sm"
                    >
                      {recipe.name}
                    </Anchor>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {recipe.ingredients.map(ing => (
                        <FactoryItemImage
                          key={ing.resource}
                          id={ing.resource}
                          size={20}
                          withTooltip
                        />
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {recipe.products.map(prod => (
                        <FactoryItemImage
                          key={prod.resource}
                          id={prod.resource}
                          size={20}
                          withTooltip
                        />
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text size="sm">{recipe.time}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </SectionCard>
      )}

      {otherUnlocks.length > 0 && (
        <SectionCard title={`Other unlocks (${otherUnlocks.length})`}>
          <Group gap="xs" wrap="wrap">
            {otherUnlocks.map(other => (
              <Badge
                key={other.script}
                variant="light"
                color="gray"
                size="md"
                title={other.script}
              >
                {other.name}
              </Badge>
            ))}
          </Group>
          <Text size="xs" c="dimmed" mt="xs">
            Game features unlocked at this milestone that aren't tracked as
            recipes or buildings in the data export.
          </Text>
        </SectionCard>
      )}

      {recipes.length === 0 &&
        buildings.length === 0 &&
        newItems.length === 0 &&
        equipment.length === 0 &&
        otherUnlocks.length === 0 && (
          <Paper withBorder p="md" radius="sm">
            <Text size="sm" c="dimmed">
              No tracked unlocks for this milestone.
            </Text>
          </Paper>
        )}
    </Stack>
  );
}
