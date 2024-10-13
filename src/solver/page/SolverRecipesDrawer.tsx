import { useStore } from '@/core/zustand';
import {
  ActionIcon,
  Button,
  Checkbox,
  Drawer,
  Group,
  Image,
  Menu,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBucket,
  IconBucketOff,
  IconDeviceFloppy,
  IconDots,
  IconDownload,
  IconSearch,
  IconTestPipe,
} from '@tabler/icons-react';
import { Fragment, useMemo, useState } from 'react';
import { AllFactoryItemsMap } from '../../recipes/FactoryItem';
import { AllFactoryRecipes, FactoryRecipe } from '../../recipes/FactoryRecipe';
import {
  usePathSolverInstance,
  useSolverAllowedRecipes,
} from '../store/solverSelectors';

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
  const [opened, { toggle, open, close }] = useDisclosure();

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
      <Button
        size="sm"
        variant="light"
        leftSection={<IconTestPipe size={16} />}
        onClick={open}
      >
        Recipes
      </Button>
      <Drawer
        position="right"
        opened={opened}
        onClose={close}
        title={
          <Stack>
            <Text size="xl">Recipes</Text>
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
                    Select none
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
                    Save as default
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconDownload size={16} />}
                    onClick={() => {
                      useStore
                        .getState()
                        .setAllowedRecipes(
                          instance!.id,
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

              {/* <Button
                leftSection={<IconDeviceFloppy size={16} />}
                variant="default"
                title="Save the current allowed recipes as default for this game"
                onClick={() => {
                  useStore
                    .getState()
                    .setGameAllowedRecipes(undefined, allowedRecipes!);
                }}
              >
                Save
              </Button> */}
            </Group>
          </Stack>
        }
      >
        <Stack gap="sm">
          {displayedProducts.map(([product, recipes]) => (
            <Fragment key={product}>
              <Group gap="xs">
                <Text key={product} size="md">
                  {AllFactoryItemsMap[product].displayName}
                </Text>
                <Image
                  src={AllFactoryItemsMap[product].imagePath}
                  alt={AllFactoryItemsMap[product].displayName}
                  w={20}
                  h={20}
                />
              </Group>
              {recipes.map(recipe => (
                <Checkbox
                  key={recipe.id}
                  label={recipe.name}
                  checked={allowedRecipes?.includes(recipe.id)}
                  onChange={e => {
                    console.log('Toggling recipe', recipe.id);
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
      </Drawer>
    </>
  );
}
