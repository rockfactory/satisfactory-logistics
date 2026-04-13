import { FormOnChangeHandler } from '@/core/form/useFormOnChange';
import { useStore } from '@/core/zustand';
import { useFactory } from '@/factories/store/factoriesSlice';
import { useGameAllowedBuildings, useGameSetting } from '@/games/gamesSlice.ts';
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
  const factory = useFactory(id);
  const gameAllowedBuildings = useGameAllowedBuildings();

  const [advanced, setAdvanced] = useState(false);
  const [useFactoryOverride, setUseFactoryOverride] = useState(
    factory?.allowedBuildings !== undefined &&
      factory?.allowedBuildings !== null,
  );

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
          <Group justify="space-between">
            <Text size="lg">Buildings</Text>
            <Switch
              label="Factory Override"
              size="xs"
              checked={useFactoryOverride}
              onChange={e => {
                const override = e.currentTarget.checked;
                setUseFactoryOverride(override);
                if (override) {
                  // Initialize with current game settings
                  useStore
                    .getState()
                    .setFactoryAllowedBuildings(
                      id!,
                      gameAllowedBuildings ?? [],
                    );
                } else {
                  // Clear factory override, use game settings
                  useStore.getState().setFactoryAllowedBuildings(id!, null);
                }
                // Recalculate blocked buildings
                const allowedBuildings = override
                  ? (gameAllowedBuildings ?? [])
                  : (gameAllowedBuildings ?? []);
                const blockedBuildings = FactoryBuildingsForRecipes.filter(
                  b => !allowedBuildings.includes(b.id),
                ).map(b => b.id);
                useStore.getState().updateSolver(id!, solver => {
                  solver.request.blockedBuildings = blockedBuildings;
                });
              }}
            />
          </Group>
          {useFactoryOverride && (
            <Text size="xs" c="dimmed" mb="xs">
              This factory has custom building settings that override the global
              game settings.
            </Text>
          )}
          {!useFactoryOverride && (
            <Text size="xs" c="dimmed" mb="xs">
              Using global game building settings. Enable override to customize
              for this factory.
            </Text>
          )}
          {FactoryBuildingsForRecipes.map(building => {
            const isChecked = useFactoryOverride
              ? (factory?.allowedBuildings?.includes(building.id) ?? false)
              : !request?.blockedBuildings?.includes(building.id);

            return (
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
                checked={isChecked}
                disabled={!useFactoryOverride}
                onChange={e => {
                  if (useFactoryOverride) {
                    // Update factory's allowedBuildings
                    useStore
                      .getState()
                      .toggleFactoryBuilding(
                        id!,
                        building.id,
                        e.currentTarget.checked,
                      );
                    // Recalculate blocked buildings for solver
                    const updatedFactory =
                      useStore.getState().factories.factories[id!];
                    const blockedBuildings = FactoryBuildingsForRecipes.filter(
                      b => !updatedFactory.allowedBuildings?.includes(b.id),
                    ).map(b => b.id);
                    useStore.getState().updateSolver(id!, solver => {
                      solver.request.blockedBuildings = blockedBuildings;
                    });
                  }
                }}
              />
            );
          })}
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
