import {
  Anchor,
  Badge,
  Container,
  Group,
  Image,
  NumberInput,
  Paper,
  SimpleGrid,
  Slider,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconArrowRight,
  IconBolt,
  IconClock,
  IconDroplet,
  IconInfinity,
  IconMathFunction,
  IconRuler,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { AllFactoryRecipes } from '@/recipes/FactoryRecipe';
import { isDefaultRecipe, isMAMRecipe } from '@/recipes/graph/SchematicGraph';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { SectionCard, StatCard } from '../components/StatCard';
import {
  getEarliestTierForBuilding,
  getMilestonesForBuilding,
} from '../tiers/tierUnlocks';

function calcOverclockedPower(
  basePower: number,
  exponent: number,
  clockPercent: number,
) {
  return basePower * (clockPercent / 100) ** exponent;
}

export function CodexBuildingDetail() {
  const { id } = useParams<{ id: string }>();
  const building = id ? AllFactoryBuildingsMap[id] : undefined;
  const [clockSpeed, setClockSpeed] = useState(100);

  const recipes = useMemo(() => {
    if (!id) return [];
    return AllFactoryRecipes.filter(r => r.producedIn === id);
  }, [id]);

  if (!building) return <Navigate to="/codex/buildings" replace />;

  const earliestTier = getEarliestTierForBuilding(building.id);
  const buildingMilestones = getMilestonesForBuilding(building.id);

  const isProduction =
    !building.conveyor &&
    !building.pipeline &&
    !building.extractor &&
    !building.powerGenerator;
  const isPowerGen = !!building.powerGenerator;
  const hasOverclock =
    (isProduction || !!building.extractor || isPowerGen) &&
    building.powerConsumptionExponent > 0;

  const overclockedPower = hasOverclock
    ? calcOverclockedPower(
        building.powerConsumption,
        building.powerConsumptionExponent,
        clockSpeed,
      )
    : building.powerConsumption;

  const productionMultiplier = clockSpeed / 100;

  const overclockedProduction = isPowerGen
    ? building.powerGenerator!.powerProduction * productionMultiplier
    : 0;

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Anchor component={Link} to="/codex/buildings" size="sm">
          <Group gap={4}>
            <IconArrowLeft size={14} />
            Back to Buildings
          </Group>
        </Anchor>

        <Paper withBorder p="lg" radius="sm">
          <Group gap="lg" align="flex-start">
            <Image
              w={96}
              h={96}
              fit="contain"
              src={building.imagePath}
              alt={building.name}
            />
            <Stack gap="xs" style={{ flex: 1 }}>
              <Title order={2}>{building.name}</Title>
              <Group gap="xs">
                {building.conveyor && <Badge variant="light">Logistics</Badge>}
                {building.pipeline && <Badge variant="light">Pipeline</Badge>}
                {building.extractor && <Badge variant="light">Extractor</Badge>}
                {building.powerGenerator && (
                  <Badge variant="light" color="yellow">
                    Power Generator
                  </Badge>
                )}
                {isProduction && (
                  <Badge variant="light" color="teal">
                    Production
                  </Badge>
                )}
                {earliestTier != null && (
                  <Badge
                    component={Link}
                    to={`/codex/tiers/${earliestTier}`}
                    variant="light"
                    color="grape"
                    style={{ cursor: 'pointer' }}
                  >
                    Unlocked at Tier {earliestTier}
                  </Badge>
                )}
              </Group>
              {building.description && (
                <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-line' }}>
                  {building.description}
                </Text>
              )}
            </Stack>
          </Group>
        </Paper>

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          {building.powerConsumption > 0 && (
            <StatCard
              label="Power Consumption"
              value={`${overclockedPower.toFixed(2)} MW`}
              icon={<IconBolt size={18} />}
              color="yellow"
              sub={
                hasOverclock && clockSpeed !== 100
                  ? `Base: ${building.powerConsumption} MW`
                  : undefined
              }
            />
          )}
          {building.powerGenerator && (
            <StatCard
              label="Power Production"
              value={`${overclockedProduction.toFixed(1)} MW`}
              icon={<IconBolt size={18} />}
              color="green"
              sub={
                hasOverclock && clockSpeed !== 100
                  ? `Base: ${building.powerGenerator.powerProduction} MW`
                  : undefined
              }
            />
          )}
          {building.somersloopSlots > 0 && (
            <StatCard
              label="Somersloop Slots"
              value={`${building.somersloopSlots}`}
              icon={<IconInfinity size={18} />}
              color="violet"
            />
          )}
          {building.conveyor && (
            <StatCard
              label="Belt Speed"
              value={`${building.conveyor.speed}/min`}
              icon={<IconArrowRight size={18} />}
              color="blue"
            />
          )}
          {building.pipeline?.flowRate != null &&
            building.pipeline.flowRate > 0 && (
              <StatCard
                label="Flow Rate"
                value={`${building.pipeline.flowRate} m³/min`}
                icon={<IconDroplet size={18} />}
                color="cyan"
              />
            )}
          {building.extractor && (
            <StatCard
              label="Items/min"
              value={`${(building.extractor.itemsPerMinute * productionMultiplier).toFixed(2)}`}
              icon={<IconClock size={18} />}
              color="teal"
              sub={
                hasOverclock && clockSpeed !== 100
                  ? `Base: ${building.extractor.itemsPerMinute}/min`
                  : undefined
              }
            />
          )}
          {building.clearance.width > 0 && (
            <StatCard
              label="Clearance (W x L x H)"
              value={`${building.clearance.width} x ${building.clearance.length} x ${building.clearance.height}`}
              icon={<IconRuler size={18} />}
              color="gray"
            />
          )}
          {building.powerConsumptionExponent > 0 &&
            building.powerConsumptionExponent !== 1 && (
              <StatCard
                label="Power Exponent"
                value={building.powerConsumptionExponent.toFixed(4)}
                icon={<IconMathFunction size={18} />}
                color="orange"
              />
            )}
        </SimpleGrid>

        {building.buildCost.length > 0 && (
          <SectionCard title="Build Cost">
            <Group gap="md">
              {building.buildCost.map(cost => {
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
                        <FactoryItemImage
                          id={cost.resource}
                          size={32}
                          withTooltip
                        />
                        <Stack gap={0}>
                          <Text size="sm" fw={500}>
                            {item?.displayName ?? cost.resource}
                          </Text>
                          <Text size="xs" c="dimmed">
                            x{cost.amount}
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

        {buildingMilestones.length > 0 && (
          <SectionCard title="Unlocked By">
            <Group gap="sm">
              {buildingMilestones.map(milestone => {
                const color =
                  milestone.type === 'Milestone'
                    ? 'blue'
                    : milestone.type === 'MAM'
                      ? 'violet'
                      : milestone.type === 'Alternate'
                        ? 'orange'
                        : 'gray';
                const label =
                  milestone.tier != null
                    ? `T${milestone.tier} · ${milestone.name}`
                    : milestone.name;
                if (milestone.type === 'Milestone' && milestone.tier != null) {
                  return (
                    <Badge
                      key={milestone.id}
                      component={Link}
                      to={`/codex/tiers/${milestone.tier}`}
                      variant="light"
                      size="lg"
                      color={color}
                      style={{ cursor: 'pointer' }}
                    >
                      {label}
                    </Badge>
                  );
                }
                return (
                  <Badge
                    key={milestone.id}
                    variant="light"
                    size="lg"
                    color={color}
                  >
                    {label}
                  </Badge>
                );
              })}
            </Group>
          </SectionCard>
        )}

        {hasOverclock && (
          <SectionCard title="Overclock">
            <Group gap="lg" align="flex-end">
              <Stack gap={4} style={{ flex: 1 }} pb="md">
                <Slider
                  value={clockSpeed}
                  onChange={setClockSpeed}
                  min={1}
                  max={250}
                  step={1}
                  marks={[
                    { value: 50, label: '50%' },
                    { value: 100, label: '100%' },
                    { value: 150, label: '150%' },
                    { value: 200, label: '200%' },
                    { value: 250, label: '250%' },
                  ]}
                  label={v => `${v}%`}
                />
              </Stack>
              <NumberInput
                value={clockSpeed}
                onChange={v => setClockSpeed(typeof v === 'number' ? v : 100)}
                min={1}
                max={250}
                step={1}
                suffix="%"
                w={100}
                size="sm"
              />
            </Group>
            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md" mt="xs">
              <StatCard label="Clock Speed" value={`${clockSpeed}%`} />
              {isPowerGen ? (
                <StatCard
                  label="Power Production"
                  value={`${overclockedProduction.toFixed(1)} MW`}
                  icon={<IconBolt size={18} />}
                  color="green"
                  sub={`${((overclockedProduction / building.powerGenerator!.powerProduction) * 100).toFixed(1)}% of base`}
                />
              ) : (
                <StatCard
                  label="Power"
                  value={`${overclockedPower.toFixed(2)} MW`}
                  icon={<IconBolt size={18} />}
                  color="yellow"
                  sub={
                    building.powerConsumption > 0
                      ? `${((overclockedPower / building.powerConsumption) * 100).toFixed(1)}% of base`
                      : undefined
                  }
                />
              )}
              <StatCard
                label="Production Rate"
                value={`${clockSpeed}%`}
                icon={<IconClock size={18} />}
                color="teal"
                sub={`${productionMultiplier.toFixed(2)}x multiplier`}
              />
            </SimpleGrid>
          </SectionCard>
        )}

        {building.powerGenerator &&
          building.powerGenerator.fuels.length > 0 && (
            <SectionCard title="Fuels">
              <Group gap="sm">
                {building.powerGenerator.fuels.map(fuel => {
                  const item = AllFactoryItemsMap[fuel.resource];
                  return (
                    <Anchor
                      key={fuel.resource}
                      component={Link}
                      to={`/codex/items/${fuel.resource}`}
                      underline="never"
                    >
                      <Paper withBorder p="xs" radius="sm">
                        <Group gap={8}>
                          <FactoryItemImage
                            id={fuel.resource}
                            size={28}
                            withTooltip
                          />
                          <Text size="sm">
                            {item?.displayName ?? fuel.resource}
                          </Text>
                        </Group>
                      </Paper>
                    </Anchor>
                  );
                })}
              </Group>
            </SectionCard>
          )}

        {recipes.length > 0 && (
          <SectionCard title={`Recipes (${recipes.length})`}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Recipe</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Ingredients</Table.Th>
                  <Table.Th>Products</Table.Th>
                  <Table.Th ta="right">Time (s)</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {recipes.map(recipe => {
                  const badge = getRecipeTypeBadge(recipe);
                  return (
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
                        <Badge size="xs" variant="light" color={badge.color}>
                          {badge.label}
                        </Badge>
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
                  );
                })}
              </Table.Tbody>
            </Table>
          </SectionCard>
        )}
      </Stack>
    </Container>
  );
}

function getRecipeTypeBadge(recipe: { id: string }) {
  if (isDefaultRecipe(recipe.id)) return { label: 'Default', color: 'teal' };
  if (isMAMRecipe(recipe.id)) return { label: 'MAM', color: 'violet' };
  return { label: 'Alternate', color: 'orange' };
}
