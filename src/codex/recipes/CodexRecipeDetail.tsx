import {
  Anchor,
  Badge,
  Container,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { assetPath } from '@/core/assetPath';
import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { AllFactoryRecipesMap } from '@/recipes/FactoryRecipe';
import {
  AllFactorySchematicsMap,
  UnlockedByMap,
} from '@/recipes/FactorySchematic';
import { isDefaultRecipe, isMAMRecipe } from '@/recipes/graph/SchematicGraph';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';

export function CodexRecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const recipe = id ? AllFactoryRecipesMap[id] : undefined;

  if (!recipe) return <Navigate to="/codex/recipes" replace />;

  const building = AllFactoryBuildingsMap[recipe.producedIn];
  const recipeType = isDefaultRecipe(recipe.id)
    ? 'Default'
    : isMAMRecipe(recipe.id)
      ? 'MAM'
      : 'Alternate';
  const badgeColor =
    recipeType === 'Default'
      ? 'teal'
      : recipeType === 'MAM'
        ? 'violet'
        : 'orange';

  const unlockedBy = UnlockedByMap[recipe.id] ?? [];

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Anchor component={Link} to="/codex/recipes" size="sm">
          <Group gap={4}>
            <IconArrowLeft size={14} />
            Back to Recipes
          </Group>
        </Anchor>

        <Group gap="lg" align="flex-start">
          {building && (
            <Image
              w={80}
              h={80}
              fit="contain"
              src={assetPath(building.imagePath)}
              alt={building.name}
            />
          )}
          <Stack gap={4}>
            <Title order={2}>{recipe.name}</Title>
            <Group gap="xs">
              <Badge variant="light" color={badgeColor}>
                {recipeType}
              </Badge>
              {building && (
                <Anchor
                  component={Link}
                  to={`/codex/buildings/${building.id}`}
                  size="sm"
                >
                  {building.name}
                </Anchor>
              )}
            </Group>
          </Stack>
        </Group>

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          <Stat label="Craft Time" value={`${recipe.time}s`} />
          {recipe.powerConsumption > 0 && (
            <Stat label="Power" value={`${recipe.powerConsumption} MW`} />
          )}
          {recipe.powerConsumptionFactor > 0 &&
            recipe.powerConsumptionFactor !== 1 && (
              <Stat
                label="Power Factor"
                value={recipe.powerConsumptionFactor.toFixed(2)}
              />
            )}
        </SimpleGrid>

        <Stack gap="xs">
          <Title order={4}>Ingredients</Title>
          <Table withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Item</Table.Th>
                <Table.Th ta="right">Amount / Cycle</Table.Th>
                <Table.Th ta="right">Rate / min</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recipe.ingredients.map(ing => {
                const item = AllFactoryItemsMap[ing.resource];
                const rate = (ing.amount * 60) / recipe.time;
                return (
                  <Table.Tr key={ing.resource}>
                    <Table.Td>
                      <Anchor
                        component={Link}
                        to={`/codex/items/${ing.resource}`}
                      >
                        <Group gap="sm">
                          <FactoryItemImage id={ing.resource} size={28} />
                          <Text size="sm">
                            {item?.displayName ?? ing.resource}
                          </Text>
                        </Group>
                      </Anchor>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm">{ing.displayAmount}</Text>
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
        </Stack>

        <Stack gap="xs">
          <Title order={4}>Products</Title>
          <Table withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Item</Table.Th>
                <Table.Th ta="right">Amount / Cycle</Table.Th>
                <Table.Th ta="right">Rate / min</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recipe.products.map(prod => {
                const item = AllFactoryItemsMap[prod.resource];
                const rate = (prod.amount * 60) / recipe.time;
                return (
                  <Table.Tr key={prod.resource}>
                    <Table.Td>
                      <Anchor
                        component={Link}
                        to={`/codex/items/${prod.resource}`}
                      >
                        <Group gap="sm">
                          <FactoryItemImage id={prod.resource} size={28} />
                          <Text size="sm">
                            {item?.displayName ?? prod.resource}
                          </Text>
                        </Group>
                      </Anchor>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm">{prod.displayAmount}</Text>
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
        </Stack>

        {unlockedBy.length > 0 && (
          <Stack gap="xs">
            <Title order={4}>Unlocked By</Title>
            <Group gap="sm">
              {unlockedBy.map(unlock => {
                const schematic = AllFactorySchematicsMap[unlock.id];
                return (
                  <Badge
                    key={unlock.id}
                    variant="light"
                    color={
                      unlock.type === 'Milestone'
                        ? 'blue'
                        : unlock.type === 'MAM'
                          ? 'violet'
                          : unlock.type === 'Alternate'
                            ? 'orange'
                            : 'gray'
                    }
                  >
                    {schematic?.name ?? unlock.id}
                  </Badge>
                );
              })}
            </Group>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
    </Stack>
  );
}
