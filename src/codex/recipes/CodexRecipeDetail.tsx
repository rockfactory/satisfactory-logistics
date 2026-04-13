import {
  Anchor,
  Badge,
  Box,
  Container,
  Group,
  Image,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconArrowNarrowRight,
  IconBolt,
  IconClock,
} from '@tabler/icons-react';
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
import { SectionCard, StatCard } from '../components/StatCard';

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

        <Paper withBorder p="lg" radius="sm">
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
            <Stack gap="xs" style={{ flex: 1 }}>
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
        </Paper>

        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
          <StatCard
            label="Craft Time"
            value={`${recipe.time}s`}
            icon={<IconClock size={18} />}
            color="blue"
          />
          {recipe.powerConsumption > 0 && (
            <StatCard
              label="Power"
              value={`${recipe.powerConsumption} MW`}
              icon={<IconBolt size={18} />}
              color="yellow"
            />
          )}
          {recipe.powerConsumptionFactor > 0 &&
            recipe.powerConsumptionFactor !== 1 && (
              <StatCard
                label="Power Factor"
                value={recipe.powerConsumptionFactor.toFixed(2)}
                icon={<IconBolt size={18} />}
                color="orange"
              />
            )}
        </SimpleGrid>

        <SectionCard title="Recipe Flow">
          <Group
            gap="md"
            align="center"
            justify="center"
            wrap="nowrap"
            style={{ overflowX: 'auto' }}
          >
            <Stack gap="xs" align="center" miw={120}>
              {recipe.ingredients.map(ing => {
                const item = AllFactoryItemsMap[ing.resource];
                const rate = (ing.amount * 60) / recipe.time;
                return (
                  <Anchor
                    key={ing.resource}
                    component={Link}
                    to={`/codex/items/${ing.resource}`}
                    underline="never"
                  >
                    <Paper withBorder p="xs" radius="sm" w="100%">
                      <Group gap={8} wrap="nowrap">
                        <FactoryItemImage id={ing.resource} size={32} />
                        <Stack gap={0}>
                          <Text size="sm" fw={500} lineClamp={1}>
                            {item?.displayName ?? ing.resource}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {ing.displayAmount} (
                            {rate % 1 === 0 ? rate : rate.toFixed(2)}/min)
                          </Text>
                        </Stack>
                      </Group>
                    </Paper>
                  </Anchor>
                );
              })}
            </Stack>

            <Stack gap={4} align="center">
              <IconArrowNarrowRight
                size={28}
                color="var(--mantine-color-dimmed)"
              />
              {building && (
                <Box>
                  <Image
                    w={40}
                    h={40}
                    fit="contain"
                    src={assetPath(building.imagePath?.replace('_256', '_64'))}
                  />
                </Box>
              )}
              <Text size="xs" c="dimmed">
                {recipe.time}s
              </Text>
            </Stack>

            <Stack gap="xs" align="center" miw={120}>
              {recipe.products.map(prod => {
                const item = AllFactoryItemsMap[prod.resource];
                const rate = (prod.amount * 60) / recipe.time;
                return (
                  <Anchor
                    key={prod.resource}
                    component={Link}
                    to={`/codex/items/${prod.resource}`}
                    underline="never"
                  >
                    <Paper withBorder p="xs" radius="sm" w="100%">
                      <Group gap={8} wrap="nowrap">
                        <FactoryItemImage id={prod.resource} size={32} />
                        <Stack gap={0}>
                          <Text size="sm" fw={500} lineClamp={1}>
                            {item?.displayName ?? prod.resource}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {prod.displayAmount} (
                            {rate % 1 === 0 ? rate : rate.toFixed(2)}/min)
                          </Text>
                        </Stack>
                      </Group>
                    </Paper>
                  </Anchor>
                );
              })}
            </Stack>
          </Group>
        </SectionCard>

        {unlockedBy.length > 0 && (
          <SectionCard title="Unlocked By">
            <Group gap="sm">
              {unlockedBy.map(unlock => {
                const schematic = AllFactorySchematicsMap[unlock.id];
                return (
                  <Badge
                    key={unlock.id}
                    variant="light"
                    size="lg"
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
          </SectionCard>
        )}
      </Stack>
    </Container>
  );
}
