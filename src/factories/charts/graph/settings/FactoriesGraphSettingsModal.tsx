import { useFormOnChange } from '@/core/form/useFormOnChange';
import { useStore } from '@/core/zustand';
import { Button, Checkbox, Modal, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconSettings } from '@tabler/icons-react';
import { useChartsSettings } from '@/factories/charts/store/chartsSlice';

export interface IFactoriesGraphSettingsModalProps {}

const updateChartSettings = (path: string | number, value: any) => {
  useStore.getState().setChartSetting(path as any, value);
};

export function FactoriesGraphSettingsModal(
  props: IFactoriesGraphSettingsModalProps,
) {
  const [opened, { open, close }] = useDisclosure();

  const settings = useChartsSettings();

  const onChangeHandler = useFormOnChange(updateChartSettings);

  return (
    <>
      <Button
        onClick={open}
        leftSection={<IconSettings size={16} />}
        variant="default"
      >
        Graph Settings
      </Button>

      <Modal title="Graph Settings" size="md" opened={opened} onClose={close}>
        <Stack gap="md">
          <Checkbox
            label="Width matches input amount"
            description="If checked, the width of the graph edges will be proportional to the input resources amount"
            checked={settings.widthMatchesInputAmount}
            onChange={onChangeHandler('widthMatchesInputAmount')}
          />
          {/* <Checkbox
            label="Colorize edges by transport"
            description="If checked, the edges will be colored by the transport type"
            checked={settings.colorizeEdgesByTransport}
            onChange={onChangeHandler('colorizeEdgesByTransport')}
          /> */}
        </Stack>
      </Modal>
    </>
  );
}
