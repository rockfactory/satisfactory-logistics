import { useStore } from '@/core/zustand';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { RecipeTooltip } from '@/recipes/ui/RecipeTooltip';
import {
  ActionIcon,
  Checkbox,
  Group,
  Menu,
  Portal,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import {
  IconBucket,
  IconBucketOff,
  IconDeviceFloppy,
  IconDots,
  IconDownload,
  IconHome,
  IconHomeOff,
  IconRoute,
  IconRouteOff,
  IconSearch,
  IconServer,
  IconServerOff,
} from '@tabler/icons-react';
import { Fragment, useMemo, useState } from 'react';
import { AllFactoryItemsMap } from '../../../recipes/FactoryItem';
import {
  AllFactoryRecipes,
  FactoryRecipe,
} from '../../../recipes/FactoryRecipe';
import {
  usePathSolverInstance,
  useSolverAllowedRecipes,
} from '../../store/solverSelectors';

const AllRecipesGroupedByProduct = AllFactoryRecipes.reduce(
  (acc, recipe) => {
    const product = recipe.products[0].resource;
    if (!acc[product]) {
      acc[product] = [];
    }
    acc[product].push(recipe);
    return acc;
  },
  {} as Record<string, FactoryRecipe[]>,
);

export interface ISolverRecipesDrawerProps {}

export function SolverRecipesDrawer(props: ISolverRecipesDrawerProps) {
  const instance = usePathSolverInstance();

  const allowedRecipes = useSolverAllowedRecipes(instance?.id);
  const [search, setSearch] = useState('');

  const displayedProducts = useMemo(() => {
    return Object.entries(AllRecipesGroupedByProduct).filter(
      ([product, recipes]) =>
        search
          ? AllFactoryItemsMap[product].name
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            recipes.some(recipe =>
              recipe.name.toLowerCase().includes(search.toLowerCase()),
            )
          : true,
    );
  }, [search]);

  const areAllSelected = useMemo(() => {
    return allowedRecipes?.length === AllFactoryRecipes.length;
  }, [allowedRecipes]);

  return (
    <>
      <Portal target="#solver-request-drawer_title">
        <Group gap="xs">
          <TextInput
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.currentTarget.value)}
            rightSection={<IconSearch size={16} />}
            size="sm"
          />

          <Tooltip label={areAllSelected ? 'Select none' : 'Select all'}>
            <ActionIcon
              variant="default"
              size="lg"
              onClick={() => {
                useStore
                  .getState()
                  .toggleAllRecipes(instance!.id, !areAllSelected);
              }}
            >
              {areAllSelected ? (
                <IconBucketOff size={16} />
              ) : (
                <IconBucket size={16} />
              )}
            </ActionIcon>
          </Tooltip>

          <Menu trigger="click-hover">
            <Menu.Target>
              <ActionIcon
                variant="default"
                size="lg"
                title="Show recipes actions"
              >
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Select</Menu.Label>
              <Menu.Item
                leftSection={<IconBucket size={16} />}
                onClick={() => {
                  useStore.getState().toggleAllRecipes(instance!.id, true);
                }}
              >
                Select all
              </Menu.Item>
              <Menu.Item
                leftSection={<IconBucketOff size={16} />}
                onClick={() => {
                  useStore.getState().toggleAllRecipes(instance!.id, false);
                }}
              >
                Remove all
              </Menu.Item>
              <Menu.Item
                leftSection={<IconHome size={16} />}
                onClick={() => {
                  useStore.getState().toggleDefaultRecipes(instance!.id, true);
                }}
              >
                Default: select all
              </Menu.Item>
              <Menu.Item
                leftSection={<IconHomeOff size={16} />}
                onClick={() => {
                  useStore.getState().toggleDefaultRecipes(instance!.id, false);
                }}
              >
                Default: remove all
              </Menu.Item>
              <Menu.Item
                leftSection={<IconServer size={16} />}
                onClick={() => {
                  useStore
                    .getState()
                    .toggleAlternateRecipes(instance!.id, true);
                }}
              >
                Alternates: select all
              </Menu.Item>
              <Menu.Item
                leftSection={<IconServerOff size={16} />}
                onClick={() => {
                  useStore
                    .getState()
                    .toggleAlternateRecipes(instance!.id, false);
                }}
              >
                Alternates: remove all
              </Menu.Item>
              <Menu.Item
                leftSection={<IconRoute size={16} />}
                onClick={() => {
                  useStore
                    .getState()
                    .toggleConverterRecipes(instance!.id, true);
                }}
              >
                Converters: select all
              </Menu.Item>
              <Menu.Item
                leftSection={<IconRouteOff size={16} />}
                onClick={() => {
                  useStore
                    .getState()
                    .toggleConverterRecipes(instance!.id, false);
                }}
              >
                Converters: remove all
              </Menu.Item>

              <Menu.Label>Game</Menu.Label>
              <Menu.Item
                leftSection={<IconDeviceFloppy size={16} />}
                onClick={() => {
                  useStore
                    .getState()
                    .setGameAllowedRecipes(undefined, allowedRecipes!);
                }}
              >
                Save as default for this game
              </Menu.Item>
              <Menu.Item
                leftSection={<IconDownload size={16} />}
                onClick={() => {
                  useStore
                    .getState()
                    .setAllowedRecipes(
                      instance!.id,
                      savedRecipes =>
                        useStore.getState().games.games[
                          useStore.getState().games.selected ?? ''
                        ]?.allowedRecipes ?? [],
                    );
                }}
              >
                Load default
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Portal>
      <Stack gap="sm">
        {displayedProducts.map(([product, recipes]) => (
          <Fragment key={product}>
            <Group gap="xs">
              <Text key={product} size="md">
                {AllFactoryItemsMap[product].displayName}
              </Text>
              <FactoryItemImage id={product} size={20} />
            </Group>
            {recipes.map(recipe => (
              <Checkbox
                key={recipe.id}
                label={
                  <RecipeTooltip recipeId={recipe.id}>
                    {recipe.name}
                  </RecipeTooltip>
                }
                checked={allowedRecipes?.includes(recipe.id) ?? true}
                onChange={e => {
                  useStore.getState().toggleRecipe(instance!.id, {
                    recipeId: recipe.id,
                    use: e.currentTarget.checked,
                  });
                }}
              />
            ))}
          </Fragment>
        ))}
      </Stack>
    </>
  );
}
