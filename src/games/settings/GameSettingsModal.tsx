import { SelectIconInput } from '@/core/form/SelectIconInput';
import { useFormOnChange } from '@/core/form/useFormOnChange';
import { useStore } from '@/core/zustand';
import { GameSettings } from '@/games/Game';
import { useGameAllowedBuildings, useGameSettings } from '@/games/gamesSlice';
import {
  FactoryBuildingsForRecipes,
  FactoryConveyorBelts,
  FactoryPipelinesExclAlternates,
} from '@/recipes/FactoryBuilding';
import { Path, setByPath } from '@clickbar/dot-diver';
import {
  Alert,
  Button,
  Checkbox,
  ColorInput,
  Group,
  Image,
  Modal,
  Space,
  Stack,
  Switch,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCheck, IconSettings } from '@tabler/icons-react';
import { useEffect } from 'react';

const gameSettingsModalListeners = new Set<() => void>();

// eslint-disable-next-line react-refresh/only-export-components
export function openGameSettingsModal() {
  gameSettingsModalListeners.forEach(fn => fn());
}

const updateGameSettings = (path: Path<GameSettings>, value: any) => {
  useStore.getState().updateGameSettings(state => {
    setByPath(state, path, value);
  });
};

const BeltsOptions = FactoryConveyorBelts.map(
  belt =>
    ({
      label: belt.name,
      value: belt.id,
      icon: <Image src={belt.imagePath} alt={belt.name} w={16} h={16} />,
    }) as const,
);

const PipelinesOptions = FactoryPipelinesExclAlternates.map(
  pipeline =>
    ({
      label: pipeline.name,
      value: pipeline.id,
      icon: (
        <Image src={pipeline.imagePath} alt={pipeline.name} w={16} h={16} />
      ),
    }) as const,
);

export function GameSettingsModal() {
  const [opened, { open, close }] = useDisclosure(false);

  useEffect(() => {
    gameSettingsModalListeners.add(open);
    return () => {
      gameSettingsModalListeners.delete(open);
    };
  }, [open]);

  const settings = useGameSettings();
  const allowedBuildings = useGameAllowedBuildings();
  const onChangeHandler = useFormOnChange<GameSettings>(updateGameSettings);

  return (
    <>
      <Modal size="md" title="Game Settings" onClose={close} opened={opened}>
        <Stack gap="xs">
          <Title order={4} mb="md">
            Usage Highlighting
          </Title>
          <Checkbox
            label="Do not highlight 100% usage"
            description="By default factories that are at 100% usage will be highlighted with a different color. Check this to keep them in red."
            checked={settings?.noHighlight100PercentUsage}
            onChange={onChangeHandler('noHighlight100PercentUsage')}
          />
          <ColorInput
            label="Highlight 100% usage color"
            description="Color used to highlight factories that are at 100% usage. By default it's a blue (#339af0)"
            value={settings?.highlight100PercentColor ?? '#339af0'}
            onChange={onChangeHandler('highlight100PercentColor')}
            format="hex"
            swatches={[
              '#339af0',
              '#868e96',
              '#fa5252',
              '#e64980',
              '#be4bdb',
              '#7950f2',
              '#4c6ef5',
              '#228be6',
              '#15aabf',
              '#12b886',
              '#40c057',
              '#82c91e',
              '#fab005',
              '#fd7e14',
            ]}
          />
          <Title order={4} mt="md" mb="md">
            Transport Limits
          </Title>
          <SelectIconInput
            label="Max Belt Level"
            data={BeltsOptions}
            description="Select the max belt level you have unlocked. Will be used to highlight belts in the calculator."
            value={settings?.maxBelt}
            clearable
            onChange={onChangeHandler('maxBelt')}
            placeholder="No belt selected"
          />
          <SelectIconInput
            label="Max Pipeline Level"
            data={PipelinesOptions}
            description="Select the max pipeline level you have unlocked. Will be used to highlight pipelines in the calculator."
            value={settings?.maxPipeline}
            clearable
            onChange={onChangeHandler('maxPipeline')}
            placeholder="No pipeline selected"
          />
          <Title order={3} mt="md" mb="md">
            Available Buildings
          </Title>
          {allowedBuildings == null ? (
            <>
              <Alert
                color="green"
                icon={<IconCheck size={16} />}
                variant="light"
                mb="xs"
              >
                All buildings are available. The solver can use any building
                without restrictions.
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
                mb="xs"
                onChange={() => {
                  useStore
                    .getState()
                    .setGameAllowedBuildings(undefined, undefined);
                  useStore.getState().syncGameBuildingsToFactories();
                }}
              />
              <Group gap="xs" mb="sm">
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
                          width={24}
                          height={24}
                        />
                        {building.name}
                      </Group>
                    }
                    checked={allowedBuildings.includes(building.id)}
                    onChange={e => {
                      useStore
                        .getState()
                        .toggleGameBuilding(
                          building.id,
                          e.currentTarget.checked,
                        );
                      useStore.getState().syncGameBuildingsToFactories();
                    }}
                  />
                ))}
              </Stack>
            </>
          )}
        </Stack>
        <Space h={50} />
      </Modal>
      <Tooltip label="Game settings: highlights, transport limits & buildings">
        <Button onClick={open} variant="light" color="gray" px="xs">
          <IconSettings size={16} />
        </Button>
      </Tooltip>
    </>
  );
}
