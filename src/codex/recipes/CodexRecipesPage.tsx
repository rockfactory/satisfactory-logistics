import {
  Anchor,
  Badge,
  Container,
  Group,
  Image,
  SegmentedControl,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import { AllFactoryRecipes, type FactoryRecipe } from '@/recipes/FactoryRecipe';
import { isDefaultRecipe, isMAMRecipe } from '@/recipes/graph/SchematicGraph';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';

type RecipeFilter = 'All' | 'Default' | 'Alternate' | 'MAM';

function getRecipeType(recipe: FactoryRecipe): 'Default' | 'Alternate' | 'MAM' {
  if (isDefaultRecipe(recipe.id)) return 'Default';
  if (isMAMRecipe(recipe.id)) return 'MAM';
  return 'Alternate';
}

function getRecipeTypeBadge(type: string) {
  if (type === 'Default') return { label: 'Default', color: 'teal' };
  if (type === 'MAM') return { label: 'MAM', color: 'violet' };
  return { label: 'Alternate', color: 'orange' };
}

export function CodexRecipesPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RecipeFilter>('All');

  const filtered = useMemo(() => {
    return AllFactoryRecipes.filter(recipe => {
      if (filter !== 'All' && getRecipeType(recipe) !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !recipe.name.toLowerCase().includes(q) &&
          !recipe.id.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [search, filter]);

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Title order={2}>Recipes</Title>

        <Group gap="md">
          <TextInput
            placeholder="Search recipes..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={e => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <SegmentedControl
            value={filter}
            onChange={v => setFilter(v as RecipeFilter)}
            data={['All', 'Default', 'Alternate', 'MAM']}
          />
        </Group>

        <Text size="sm" c="dimmed">
          {filtered.length} recipes
        </Text>

        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Recipe</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Building</Table.Th>
              <Table.Th>Ingredients</Table.Th>
              <Table.Th>Products</Table.Th>
              <Table.Th ta="right">Time (s)</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map(recipe => {
              const type = getRecipeType(recipe);
              const badge = getRecipeTypeBadge(type);
              const building = AllFactoryBuildingsMap[recipe.producedIn];

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
                    <Text size="sm">{recipe.time}</Text>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Stack>
    </Container>
  );
}
