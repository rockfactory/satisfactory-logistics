import {
  Alert,
  Button,
  Checkbox,
  Group,
  Image,
  Stack,
  Switch,
} from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import type { Ref } from 'react';
import { useStore } from '@/core/zustand';
import { FactoryBuildingsForRecipes } from '@/recipes/FactoryBuilding';
import { SettingSectionCard } from '../SettingSectionCard';
import { SETTINGS_SECTIONS } from '../settingsSections';

interface AvailableBuildingsSectionProps {
  ref?: Ref<HTMLDivElement>;
  allowedBuildings: string[] | undefined;
}

const section = SETTINGS_SECTIONS.find(s => s.id === 'buildings')!;

export function AvailableBuildingsSection({
  ref,
  allowedBuildings,
}: AvailableBuildingsSectionProps) {
  return (
    <SettingSectionCard section={section} ref={ref}>
      {allowedBuildings == null ? (
        <>
          <Alert color="green" icon={<IconCheck size={16} />} variant="light">
            All buildings are available. The solver can use any building without
            restrictions.
          </Alert>
          <Switch
            label="Restrict buildings"
            description="Enable to choose which buildings the solver can use"
            checked={false}
            onChange={() => {
              useStore.getState().enableAllGameBuildings();
              useStore.getState().syncGameBuildingsToFactories();
            }}
          />
        </>
      ) : (
        <>
          <Switch
            label="Restrict buildings"
            description="Disable to allow all buildings"
            checked={true}
            onChange={() => {
              useStore.getState().setGameAllowedBuildings(undefined, undefined);
              useStore.getState().syncGameBuildingsToFactories();
            }}
          />
          <Group gap="xs">
            <Button
              size="xs"
              variant="light"
              onClick={() => {
                useStore.getState().enableAllGameBuildings();
                useStore.getState().syncGameBuildingsToFactories();
              }}
            >
              Enable All
            </Button>
            <Button
              size="xs"
              variant="light"
              color="red"
              onClick={() => {
                useStore.getState().disableAllGameBuildings();
                useStore.getState().syncGameBuildingsToFactories();
              }}
            >
              Disable All
            </Button>
          </Group>
          <Stack gap="xs">
            {FactoryBuildingsForRecipes.map(building => (
              <Checkbox
                key={building.id}
                label={
                  <Group gap="xs">
                    <Image
                      src={building.imagePath.replace('_256', '_64')}
                      w={24}
                      h={24}
                    />
                    {building.name}
                  </Group>
                }
                checked={allowedBuildings.includes(building.id)}
                onChange={e => {
                  useStore
                    .getState()
                    .toggleGameBuilding(building.id, e.currentTarget.checked);
                  useStore.getState().syncGameBuildingsToFactories();
                }}
              />
            ))}
          </Stack>
        </>
      )}
    </SettingSectionCard>
  );
}
