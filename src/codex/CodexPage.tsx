import {
  Card,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconBox,
  IconBuildingFactory2,
  IconStairsUp,
  IconToolsKitchen2,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { AllFactoryBuildings } from '@/recipes/FactoryBuilding';
import { AllFactoryItems } from '@/recipes/FactoryItem';
import { AllFactoryRecipes } from '@/recipes/FactoryRecipe';
import { TierTotals } from './tiers/tierUnlocks';

const categories = [
  {
    id: 'items',
    to: '/codex/items',
    icon: IconBox,
    color: 'teal',
    title: 'Items',
    description: 'Browse all producible items, resources, and materials.',
    count: AllFactoryItems.length,
  },
  {
    id: 'buildings',
    to: '/codex/buildings',
    icon: IconBuildingFactory2,
    color: 'blue',
    title: 'Buildings',
    description:
      'Explore production buildings, logistics, extractors, and power generators.',
    count: AllFactoryBuildings.length,
  },
  {
    id: 'recipes',
    to: '/codex/recipes',
    icon: IconToolsKitchen2,
    color: 'orange',
    title: 'Recipes',
    description:
      'View all recipes including default, alternate, and MAM research recipes.',
    count: AllFactoryRecipes.length,
  },
  {
    id: 'tiers',
    to: '/codex/tiers',
    icon: IconStairsUp,
    color: 'grape',
    title: 'Tiers',
    description:
      'Walk the HUB progression and see what each tier and milestone unlocks.',
    count: TierTotals.tiers,
  },
];

export function CodexPage() {
  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Title order={2}>Codex</Title>
        <Text c="dimmed" size="sm">
          A complete reference of all items, buildings, and recipes in
          Satisfactory.
        </Text>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          {categories.map(cat => (
            <Card
              key={cat.id}
              component={Link}
              to={cat.to}
              data-tutorial-id={`codex-category-${cat.id}`}
              withBorder
              padding="lg"
              style={{ cursor: 'pointer' }}
            >
              <Group gap="md" wrap="nowrap" align="flex-start">
                <cat.icon
                  size={32}
                  color={`var(--mantine-color-${cat.color}-5)`}
                />
                <Stack gap={4}>
                  <Group gap="xs">
                    <Title order={4}>{cat.title}</Title>
                    <Text size="xs" c="dimmed">
                      ({cat.count})
                    </Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {cat.description}
                  </Text>
                </Stack>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
