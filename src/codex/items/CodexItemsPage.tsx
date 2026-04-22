import {
  Badge,
  Card,
  Container,
  Group,
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
import {
  AllFactoryItems,
  type FactoryItem,
  FactoryItemForm,
} from '@/recipes/FactoryItem';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';

type FormFilter = 'All' | 'Solid' | 'Liquid' | 'Gas';

const FORM_FILTERS: FormFilter[] = ['All', 'Solid', 'Liquid', 'Gas'];

function matchesSearch(item: FactoryItem, query: string) {
  const q = query.toLowerCase();
  return (
    item.displayName.toLowerCase().includes(q) ||
    item.id.toLowerCase().includes(q)
  );
}

export function CodexItemsPage() {
  const [search, setSearch] = useState('');
  const [formFilter, setFormFilter] = useState<FormFilter>('All');

  const filtered = useMemo(() => {
    return AllFactoryItems.filter(item => {
      if (item.form === FactoryItemForm.Invalid) return false;
      if (formFilter !== 'All' && item.form !== formFilter) return false;
      if (search && !matchesSearch(item, search)) return false;
      return true;
    });
  }, [search, formFilter]);

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Title order={2}>Items</Title>

        <Group gap="md">
          <TextInput
            placeholder="Search items..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={e => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <SegmentedControl
            value={formFilter}
            onChange={v => setFormFilter(v as FormFilter)}
            data={FORM_FILTERS}
          />
        </Group>

        <Text size="sm" c="dimmed">
          {filtered.length} items
        </Text>

        <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="sm">
          {filtered.map(item => (
            <Card
              key={item.id}
              component={Link}
              to={`/codex/items/${item.id}`}
              withBorder
              padding="sm"
              style={{ cursor: 'pointer' }}
            >
              <Stack gap="xs" align="center">
                <FactoryItemImage id={item.id} size={64} highRes withTooltip />
                <Text size="sm" ta="center" fw={500} lineClamp={2}>
                  {item.displayName}
                </Text>
                <Group gap={4}>
                  <Badge size="xs" variant="light" color="gray">
                    {item.form}
                  </Badge>
                  {item.sinkPoints > 0 && (
                    <Badge size="xs" variant="light" color="yellow">
                      {item.sinkPoints} pts
                    </Badge>
                  )}
                </Group>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
