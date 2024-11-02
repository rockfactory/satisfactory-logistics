import type { FormOnChangeHandler } from '@/core/form/useFormOnChange';
import { useStore } from '@/core/zustand';
import { FactoryBuildingsForRecipes } from '@/recipes/FactoryBuilding';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { WorldResourcesList } from '@/recipes/WorldResources';
import type { SolverInstance } from '@/solver/store/Solver';
import { usePathSolverRequest } from '@/solver/store/solverSelectors';
import { Checkbox, Group, Image, SimpleGrid, Stack, Text } from '@mantine/core';

export interface ISolverLimitationsDrawerProps {
  id?: string | null | undefined;
  onSolverChangeHandler: FormOnChangeHandler<SolverInstance>;
}

export function SolverLimitationsDrawer(props: ISolverLimitationsDrawerProps) {
  const { id, onSolverChangeHandler } = props;

  const request = usePathSolverRequest();

  return (
    <>
      <Stack gap="md">
        <SimpleGrid cols={2} spacing="md">
          <Stack gap="xs">
            <Text size="lg">World Resources</Text>
            {WorldResourcesList.map((resource, index) => {
              const item = AllFactoryItemsMap[resource];
              return (
                <Checkbox
                  key={resource}
                  label={
                    <Group gap="xs">
                      <FactoryItemImage size={24} id={resource} />
                      {item.name}
                    </Group>
                  }
                  checked={
                    request?.allowedResources?.includes(resource) ?? true
                  }
                  onChange={e =>
                    useStore
                      .getState()
                      .toggleAllowedResource(
                        id!,
                        resource,
                        e.currentTarget.checked,
                      )
                  }
                />
              );
            })}
          </Stack>
          <Stack gap="xs">
            <Text size="lg">Buildings</Text>
            {FactoryBuildingsForRecipes.map(building => (
              <Checkbox
                key={building.id}
                label={
                  <Group gap="xs">
                    <Image
                      src={building.imagePath.replace('_256', '_64')}
                      width={24}
                      height={24}
                    />
                    {building.name}
                  </Group>
                }
                checked={
                  request?.allowedBuildings?.includes(building.id) ?? true
                }
                onChange={e =>
                  useStore
                    .getState()
                    .toggleAllowedBuilding(
                      id!,
                      building.id,
                      e.currentTarget.checked,
                    )
                }
              />
            ))}
          </Stack>
        </SimpleGrid>
      </Stack>
    </>
  );
}
