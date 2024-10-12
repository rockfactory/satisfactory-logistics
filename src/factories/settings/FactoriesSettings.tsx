import { Path, setByPath } from '@clickbar/dot-diver';
import {
  Button,
  Checkbox,
  ColorInput,
  Modal,
  Space,
  Stack,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconSettings } from '@tabler/icons-react';
import { useFormOnChange } from '../../core/form/useFormOnChange';
import { useStore } from '../../core/zustand';
import { GameSettings } from '../../games/Game';
import { useGameSettings } from '../../games/gamesSlice';

export interface IFactoriesSettingsProps {}

const updateGameSettings = (path: Path<GameSettings>, value: any) => {
  useStore.getState().updateGameSettings(state => {
    setByPath(state, path, value);
  });
};

// TODO Rename in GameSettings
export function FactoriesSettings(props: IFactoriesSettingsProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const settings = useGameSettings();
  const onChangeHandler = useFormOnChange<GameSettings>(updateGameSettings);

  return (
    <>
      <Modal size="md" title="Settings" onClose={close} opened={opened}>
        <Stack gap="xs">
          <Title order={3} mb="md">
            Usage
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
        </Stack>
        <Space h={50} />
      </Modal>
      <Button
        onClick={open}
        variant="default"
        size="sm"
        leftSection={<IconSettings size={16} />}
      >
        Settings
      </Button>
    </>
  );
}
