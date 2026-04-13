import {
  Anchor,
  Badge,
  Container,
  Group,
  Image,
  NumberInput,
  SimpleGrid,
  Slider,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { assetPath } from '@/core/assetPath';
import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { AllFactoryRecipes } from '@/recipes/FactoryRecipe';
import { isDefaultRecipe, isMAMRecipe } from '@/recipes/graph/SchematicGraph';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';

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

  const isProduction =
    !building.conveyor &&
    !building.pipeline &&
    !building.extractor &&
    !building.powerGenerator;
  const hasOverclock =
    building.powerConsumption > 0 &&
    building.powerConsumptionExponent > 0 &&
    (isProduction || !!building.extractor);

  const overclockedPower = hasOverclock
    ? calcOverclockedPower(
        building.powerConsumption,
        building.powerConsumptionExponent,
        clockSpeed,
      )
    : building.powerConsumption;

  const productionMultiplier = clockSpeed / 100;

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Anchor component={Link} to="/codex/buildings" size="sm">
          <Group gap={4}>
            <IconArrowLeft size={14} />
            Back to Buildings
          </Group>
        </Anchor>

        <Group gap="lg" align="flex-start">
          <Image
            w={96}
            h={96}
            fit="contain"
            src={assetPath(building.imagePath)}
            alt={building.name}
          />
          <Stack gap={4}>
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
            </Group>
          </Stack>
        </Group>

        {building.description && (
          <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
            {building.description}
          </Text>
        )}

        {building.buildCost.length > 0 && (
          <Stack gap="xs">
            <Title order={4}>Build Cost</Title>
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
                    <Group gap={6}>
                      <FactoryItemImage id={cost.resource} size={28} />
                      <Stack gap={0}>
                        <Text size="sm" fw={500}>
                          {item?.displayName ?? cost.resource}
                        </Text>
                        <Text size="xs" c="dimmed">
                          x{cost.amount}
                        </Text>
                      </Stack>
                    </Group>
                  </Anchor>
                );
              })}
            </Group>
          </Stack>
        )}

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          {building.powerConsumption > 0 && (
            <StatBlock
              label="Power Consumption"
              value={`${overclockedPower.toFixed(2)} MW`}
              sub={
                hasOverclock && clockSpeed !== 100
                  ? `Base: ${building.powerConsumption} MW`
                  : undefined
              }
            />
          )}
          {building.powerGenerator && (
            <StatBlock
              label="Power Production"
              value={`${building.powerGenerator.powerProduction} MW`}
            />
          )}
          {building.somersloopSlots > 0 && (
            <StatBlock
              label="Somersloop Slots"
              value={`${building.somersloopSlots}`}
            />
          )}
          {building.conveyor && (
            <StatBlock
              label="Belt Speed"
              value={`${building.conveyor.speed}/min`}
            />
          )}
          {building.pipeline?.flowRate != null &&
            building.pipeline.flowRate > 0 && (
              <StatBlock
                label="Flow Rate"
                value={`${building.pipeline.flowRate} m³/min`}
              />
            )}
          {building.extractor && (
            <StatBlock
              label="Items/min"
              value={`${(building.extractor.itemsPerMinute * productionMultiplier).toFixed(2)}`}
              sub={
                hasOverclock && clockSpeed !== 100
                  ? `Base: ${building.extractor.itemsPerMinute}/min`
                  : undefined
              }
            />
          )}
          {building.clearance.width > 0 && (
            <StatBlock
              label="Clearance (W × L × H)"
              value={`${building.clearance.width} × ${building.clearance.length} × ${building.clearance.height}`}
            />
          )}
          {building.powerConsumptionExponent > 0 &&
            building.powerConsumptionExponent !== 1 && (
              <StatBlock
                label="Power Exponent"
                value={building.powerConsumptionExponent.toFixed(4)}
              />
            )}
        </SimpleGrid>

        {hasOverclock && (
          <Stack gap="xs">
            <Title order={4}>Overclock</Title>
            <Group gap="lg" align="flex-end">
              <Stack gap={4} style={{ flex: 1 }}>
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
            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md" mt="sm">
              <StatBlock label="Clock Speed" value={`${clockSpeed}%`} />
              <StatBlock
                label="Power"
                value={`${overclockedPower.toFixed(2)} MW`}
                sub={`${((overclockedPower / building.powerConsumption) * 100).toFixed(1)}% of base`}
              />
              <StatBlock
                label="Production Rate"
                value={`${clockSpeed}%`}
                sub={`${productionMultiplier.toFixed(2)}x multiplier`}
              />
            </SimpleGrid>
          </Stack>
        )}

        {building.powerGenerator &&
          building.powerGenerator.fuels.length > 0 && (
            <Stack gap="xs">
              <Title order={4}>Fuels</Title>
              <Group gap="sm">
                {building.powerGenerator.fuels.map(fuel => {
                  const item = AllFactoryItemsMap[fuel.resource];
                  return (
                    <Anchor
                      key={fuel.resource}
                      component={Link}
                      to={`/codex/items/${fuel.resource}`}
                    >
                      <Group gap={4}>
                        <FactoryItemImage id={fuel.resource} size={24} />
                        <Text size="sm">
                          {item?.displayName ?? fuel.resource}
                        </Text>
                      </Group>
                    </Anchor>
                  );
                })}
              </Group>
            </Stack>
          )}

        {recipes.length > 0 && (
          <Stack gap="xs">
            <Title order={4}>Recipes ({recipes.length})</Title>
            <Table striped highlightOnHover withTableBorder>
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
          </Stack>
        )}
      </Stack>
    </Container>
  );
}

function StatBlock({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
      {sub && (
        <Text size="xs" c="dimmed">
          {sub}
        </Text>
      )}
    </Stack>
  );
}

function getRecipeTypeBadge(recipe: { id: string }) {
  if (isDefaultRecipe(recipe.id)) return { label: 'Default', color: 'teal' };
  if (isMAMRecipe(recipe.id)) return { label: 'MAM', color: 'violet' };
  return { label: 'Alternate', color: 'orange' };
}
