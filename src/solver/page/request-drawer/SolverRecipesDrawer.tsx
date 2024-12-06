import { useStore } from '@/core/zustand';
import { AllFactoryRecipes } from '@/recipes/FactoryRecipe';
import { ImportSavegameRecipesModal } from '@/recipes/savegame/ImportSavegameRecipesModal';
import type { ParsedSatisfactorySave } from '@/recipes/savegame/ParseSavegameMessages';
import {
  usePathSolverInstance,
  useSolverAllowedRecipes,
} from '@/solver/store/solverSelectors';
import {
  ActionIcon,
  Group,
  Menu,
  Portal,
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
import { useMemo, useState } from 'react';
import { SolverRecipesList } from './recipes/SolverRecipesList';

export interface ISolverRecipesDrawerProps {
  id: string;
}

export function SolverRecipesDrawer(props: ISolverRecipesDrawerProps) {
  const instance = usePathSolverInstance(props.id);

  const allowedRecipes = useSolverAllowedRecipes(instance?.id);
  const [search, setSearch] = useState('');

  const areAllSelected = useMemo(() => {
    return allowedRecipes?.length === AllFactoryRecipes.length;
  }, [allowedRecipes]);

  const handleSetRecipesFromImport = (
    save: ParsedSatisfactorySave,
    asDefault: boolean,
  ) => {
    const availableRecipes = new Set(save.availableRecipes);
    const saveRecipes = AllFactoryRecipes.filter(
      // We should only import recipes that are available in the savegame,
      // but custom recipes are not directly present in it.
      // For now, we just import all custom recipes.
      recipe => availableRecipes.has(recipe.id) || recipe.customType != null,
    ).map(recipe => recipe.id);

    useStore.getState().setAllowedRecipes(instance!.id, () => saveRecipes);

    if (asDefault) {
      useStore.getState().setGameAllowedRecipes(undefined, saveRecipes);
    }
  };

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

          <ImportSavegameRecipesModal onImported={handleSetRecipesFromImport} />
        </Group>
      </Portal>
      <SolverRecipesList search={search} solverId={instance?.id} />
    </>
  );
}
