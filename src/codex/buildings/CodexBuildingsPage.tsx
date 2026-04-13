import {
  Badge,
  Card,
  Container,
  Group,
  Image,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { assetPath } from '@/core/assetPath';
import {
  AllFactoryBuildings,
  type FactoryBuilding,
} from '@/recipes/FactoryBuilding';

type BuildingCategory =
  | 'All'
  | 'Production'
  | 'Logistics'
  | 'Power'
  | 'Extraction';

function categorizeBuilding(b: FactoryBuilding): BuildingCategory {
  if (b.extractor) return 'Extraction';
  if (b.powerGenerator) return 'Power';
  if (b.conveyor || b.pipeline) return 'Logistics';
  return 'Production';
}

function matchesSearch(building: FactoryBuilding, query: string) {
  const q = query.toLowerCase();
  return (
    building.name.toLowerCase().includes(q) ||
    building.id.toLowerCase().includes(q)
  );
}

export function CodexBuildingsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<BuildingCategory>('All');

  const filtered = useMemo(() => {
    return AllFactoryBuildings.filter(b => {
      if (category !== 'All' && categorizeBuilding(b) !== category)
        return false;
      if (search && !matchesSearch(b, search)) return false;
      return true;
    });
  }, [search, category]);

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Title order={2}>Buildings</Title>

        <Group gap="md">
          <TextInput
            placeholder="Search buildings..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={e => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <SegmentedControl
            value={category}
            onChange={v => setCategory(v as BuildingCategory)}
            data={['All', 'Production', 'Logistics', 'Power', 'Extraction']}
          />
        </Group>

        <Text size="sm" c="dimmed">
          {filtered.length} buildings
        </Text>

        <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="sm">
          {filtered.map(building => {
            const cat = categorizeBuilding(building);
            return (
              <Card
                key={building.id}
                component={Link}
                to={`/codex/buildings/${building.id}`}
                withBorder
                padding="sm"
                style={{ cursor: 'pointer' }}
              >
                <Stack gap="xs" align="center">
                  <Image
                    w={64}
                    h={64}
                    fit="contain"
                    src={assetPath(building.imagePath)}
                    alt={building.name}
                  />
                  <Text size="sm" ta="center" fw={500} lineClamp={2}>
                    {building.name}
                  </Text>
                  <Group gap={4}>
                    <Badge size="xs" variant="light" color="gray">
                      {cat}
                    </Badge>
                    {building.powerConsumption > 0 && (
                      <Badge size="xs" variant="light" color="yellow">
                        {building.powerConsumption} MW
                      </Badge>
                    )}
                  </Group>
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
