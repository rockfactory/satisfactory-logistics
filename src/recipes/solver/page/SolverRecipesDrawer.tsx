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
import { IconSearch, IconTestPipe } from '@tabler/icons-react';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AllFactoryItemsMap } from '../../FactoryItem';
import { AllFactoryRecipes, FactoryRecipe } from '../../FactoryRecipe';
import {
  solverActions,
  usePathSolverAllowedRecipes,
  usePathSolverInstance,
} from '../store/SolverSlice';

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
  const dispatch = useDispatch();
  const allowedRecipes = usePathSolverAllowedRecipes();
  const [search, setSearch] = useState('');

  return (
    <>
      <Button
        size="sm"
        variant="filled"
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
            <TextInput
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.currentTarget.value)}
              rightSection={<IconSearch size={16} />}
              size="sm"
            />
          </Stack>
        }
      >
        <Stack gap="sm">
          {Object.entries(AllRecipesGroupedByProduct)
            .filter(([product, recipes]) =>
              search
                ? AllFactoryItemsMap[product].name
                    .toLowerCase()
                    .includes(search.toLowerCase()) ||
                  recipes.some(recipe =>
                    recipe.name.toLowerCase().includes(search.toLowerCase()),
                  )
                : true,
            )
            .map(([product, recipes]) => (
              <>
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
                      dispatch(
                        solverActions.toggleRecipe({
                          id: instance!.id,
                          recipe: recipe.id,
                          use: e.currentTarget.checked,
                        }),
                      );
                    }}
                  />
                ))}
              </>
            ))}
        </Stack>
      </Drawer>
    </>
  );
}
