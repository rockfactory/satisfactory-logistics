import { useStore } from '@/core/zustand';
import {
  Button,
  Checkbox,
  Drawer,
  Group,
  Image,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconDeviceFloppy,
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
              <Button
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
              </Button>
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
