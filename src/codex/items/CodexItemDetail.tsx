import {
  Anchor,
  Badge,
  Container,
  Group,
  Image,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconCoin,
  IconFlame,
  IconRadioactive,
} from '@tabler/icons-react';
import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { AllFactoryRecipes, type FactoryRecipe } from '@/recipes/FactoryRecipe';
import { isDefaultRecipe, isMAMRecipe } from '@/recipes/graph/SchematicGraph';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { SectionCard, StatCard } from '../components/StatCard';

function getRecipeTypeBadge(recipe: FactoryRecipe) {
  if (isDefaultRecipe(recipe.id)) return { label: 'Default', color: 'teal' };
  if (isMAMRecipe(recipe.id)) return { label: 'MAM', color: 'violet' };
  return { label: 'Alternate', color: 'orange' };
}

export function CodexItemDetail() {
  const { id } = useParams<{ id: string }>();
  const item = id ? AllFactoryItemsMap[id] : undefined;

  const { producedBy, usedIn } = useMemo(() => {
    if (!id) return { producedBy: [], usedIn: [] };
    return {
      producedBy: AllFactoryRecipes.filter(r =>
        r.products.some(p => p.resource === id),
      ),
      usedIn: AllFactoryRecipes.filter(r =>
        r.ingredients.some(i => i.resource === id),
      ),
    };
  }, [id]);

  if (!item) return <Navigate to="/codex/items" replace />;

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Anchor component={Link} to="/codex/items" size="sm">
          <Group gap={4}>
            <IconArrowLeft size={14} />
            Back to Items
          </Group>
        </Anchor>

        <Paper withBorder p="lg" radius="sm">
          <Group gap="lg" align="flex-start">
            <FactoryItemImage id={item.id} size={96} highRes />
            <Stack gap="xs" style={{ flex: 1 }}>
              <Title order={2}>{item.displayName}</Title>
              <Group gap="xs">
                <Badge variant="light" color="gray">
                  {item.form}
                </Badge>
                {item.isFicsmas && (
                  <Badge variant="light" color="red">
                    FICSMAS
                  </Badge>
                )}
              </Group>
              {item.description && (
                <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-line' }}>
                  {item.description}
                </Text>
              )}
            </Stack>
          </Group>
        </Paper>

        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
          {item.sinkPoints > 0 && (
            <StatCard
              label="Sink Points"
              value={item.sinkPoints.toLocaleString()}
              icon={<IconCoin size={18} />}
              color="yellow"
            />
          )}
          {item.energyValue > 0 && (
            <StatCard
              label="Energy Value"
              value={`${item.energyValue} MJ`}
              icon={<IconFlame size={18} />}
              color="orange"
            />
          )}
          {item.radioactiveDecay > 0 && (
            <StatCard
              label="Radioactive Decay"
              value={item.radioactiveDecay.toString()}
              icon={<IconRadioactive size={18} />}
              color="red"
            />
          )}
        </SimpleGrid>

        {producedBy.length > 0 && (
          <SectionCard title={`Produced By (${producedBy.length})`}>
            <RecipeTable
              recipes={producedBy}
              highlightResource={id!}
              type="product"
            />
          </SectionCard>
        )}

        {usedIn.length > 0 && (
          <SectionCard title={`Used In (${usedIn.length})`}>
            <RecipeTable
              recipes={usedIn}
              highlightResource={id!}
              type="ingredient"
            />
          </SectionCard>
        )}
      </Stack>
    </Container>
  );
}

function RecipeTable({
  recipes,
  highlightResource,
  type,
}: {
  recipes: FactoryRecipe[];
  highlightResource: string;
  type: 'product' | 'ingredient';
}) {
  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Recipe</Table.Th>
          <Table.Th>Type</Table.Th>
          <Table.Th>Building</Table.Th>
          <Table.Th>Ingredients</Table.Th>
          <Table.Th>Products</Table.Th>
          <Table.Th ta="right">Rate (/min)</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {recipes.map(recipe => {
          const badge = getRecipeTypeBadge(recipe);
          const building = AllFactoryBuildingsMap[recipe.producedIn];
          const relevantPart =
            type === 'product'
              ? recipe.products.find(p => p.resource === highlightResource)
              : recipe.ingredients.find(i => i.resource === highlightResource);
          const rate = relevantPart
            ? (relevantPart.amount * 60) / recipe.time
            : 0;

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
                {building && (
                  <Group gap={4} wrap="nowrap">
                    <Image
                      w={20}
                      h={20}
                      src={building.imagePath?.replace('_256', '_64')}
                    />
                    <Text size="xs">{building.name}</Text>
                  </Group>
                )}
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
                <Text size="sm" fw={500}>
                  {rate % 1 === 0 ? rate : rate.toFixed(2)}
                </Text>
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
