import {
  FormOnChangeHandler,
  useFormOnChange,
} from '@/core/form/useFormOnChange';
import { useStore } from '@/core/zustand';
import {
  FactoryBuildingsForRecipes,
  FactoryConveyorBelts,
  FactoryPipelines,
  FactoryPipelinesExclAlternates,
} from '@/recipes/FactoryBuilding';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { WorldResourcesList } from '@/recipes/WorldResources';
import type { SolverInstance } from '@/solver/store/Solver';
import { usePathSolverRequest } from '@/solver/store/solverSelectors';
import {
  Checkbox,
  Group,
  Image,
  Radio,
  SimpleGrid,
  Space,
  Stack,
  Text,
} from '@mantine/core';
import { useGameSetting } from '@/games/gamesSlice.ts';
import { setByPath } from '@clickbar/dot-diver';

export interface ISolverLimitationsDrawerProps {
  id?: string | null | undefined;
  onSolverChangeHandler: FormOnChangeHandler<SolverInstance>;
}

export function SolverLimitationsDrawer(
  props: Readonly<ISolverLimitationsDrawerProps>,
) {
  const { id } = props;

  const request = usePathSolverRequest();
  const maxPipeline = useGameSetting('maxPipeline');
  const maxBelt = useGameSetting('maxBelt');

  return (
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
                checked={!request?.blockedResources?.includes(resource)}
                onChange={e =>
                  useStore
                    .getState()
                    .toggleBlockedResource(
                      id!,
                      resource,
                      !e.currentTarget.checked,
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
              checked={!request?.blockedBuildings?.includes(building.id)}
              onChange={e =>
                useStore
                  .getState()
                  .toggleBlockedBuilding(
                    id!,
                    building.id,
                    !e.currentTarget.checked,
                  )
              }
            />
          ))}
        </Stack>
        <Stack gap="sm" style={{ gridColumn: 'span 2' }}>
          <Text size="lg">Logistics</Text>
          <Text size="sm">
            Selecting a belt or a pipeline will highlight in the calculator all
            the ingredients which are exceeding the belt / pipeline amount.
          </Text>
        </Stack>
        <Stack gap="xs">
          <Text size="lg">Belt Logistic</Text>
          {FactoryConveyorBelts.map((building, index) => (
            <Radio
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
                maxBelt === building.id ||
                (!maxBelt && index === FactoryConveyorBelts.length - 1)
              }
              onChange={e =>
                useStore.getState().updateGameSettings(state => {
                  setByPath(state, 'maxBelt', building.id);
                })
              }
            />
          ))}
        </Stack>
        <Stack gap="xs">
          <Text size="lg">Pipeline Logistic</Text>
          {FactoryPipelinesExclAlternates.map((building, index) => (
            <Radio
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
                maxPipeline === building.id ||
                (!maxPipeline &&
                  index === FactoryPipelinesExclAlternates.length - 1)
              }
              onChange={e =>
                useStore.getState().updateGameSettings(state => {
                  setByPath(state, 'maxPipeline', building.id);
                })
              }
            />
          ))}
        </Stack>
      </SimpleGrid>
    </Stack>
  );
}
