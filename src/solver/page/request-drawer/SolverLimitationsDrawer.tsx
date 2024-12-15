import { FormOnChangeHandler } from '@/core/form/useFormOnChange';
import { useStore } from '@/core/zustand';
import { useGameSetting } from '@/games/gamesSlice';
import {
  FactoryBuildingsForRecipes,
  FactoryConveyorBelts,
  FactoryPipelinesExclAlternates,
} from '@/recipes/FactoryBuilding';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { WorldResourcesList } from '@/recipes/WorldResources';
import type { SolverInstance } from '@/solver/store/Solver';
import { usePathSolverRequest } from '@/solver/store/solverSelectors';
import {
  Alert,
  Checkbox,
  Group,
  Image,
  List,
  Radio,
  SimpleGrid,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import { IconInfoCircleFilled } from '@tabler/icons-react';
import { useState } from 'react';
import { LimitationResourceAmountInput } from './limitations/LimitationResourceAmountInput';

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

  const [advanced, setAdvanced] = useState(false);

  const showAdvanced =
    advanced ||
    Object.values(request.resourcesAmount ?? {}).some(
      amount => amount !== undefined,
    );

  const setShowAdvanced = (value: boolean) => {
    setAdvanced(value);
    if (!value) {
      useStore.getState().resetSolverResourcesAmount(id!);
    }
  };

  return (
    <Stack gap="md">
      <SimpleGrid cols={2} spacing="md">
        <Stack gap="xs">
          <Group gap="xs" justify="space-between">
            <Text size="lg">World Resources</Text>
            <Switch
              label="Custom Amounts"
              checked={showAdvanced}
              onChange={() => setShowAdvanced(!showAdvanced)}
            />
          </Group>
          {showAdvanced && (
            <Alert color="orange" icon={<IconInfoCircleFilled size={16} />}>
              If you just just want to limit a resource consumption to a
              specific amount, you can:
              <List type="ordered" size="sm" mt="xs" mb="xs">
                <List.Item>Disable the World resource here</List.Item>
                <List.Item>
                  Add an input of the desired amount in the{' '}
                  <em>Inputs/Outputs</em> tab.
                </List.Item>
              </List>
              Inputs will always be used even if the resource is disabled here.
            </Alert>
          )}
          {WorldResourcesList.map((resource, index) => {
            const item = AllFactoryItemsMap[resource];
            return (
              <Group key={resource} justify="space-between">
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

                {showAdvanced && (
                  <LimitationResourceAmountInput resource={resource} />
                )}
              </Group>
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
                useStore
                  .getState()
                  .updateGameSettings(
                    settings => (settings.maxBelt = building.id),
                  )
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
                useStore
                  .getState()
                  .updateGameSettings(
                    settings => (settings.maxPipeline = building.id),
                  )
              }
            />
          ))}
        </Stack>
      </SimpleGrid>
    </Stack>
  );
}
