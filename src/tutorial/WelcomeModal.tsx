import { Button, Group, List, Modal, Stack, Text, Title } from '@mantine/core';
import {
  IconBuildingFactory,
  IconCalculator,
  IconChartBar,
  IconDeviceGamepad,
  IconHelp,
  IconPlayerPlay,
  IconX,
} from '@tabler/icons-react';

export interface IWelcomeModalProps {
  opened: boolean;
  onStart: () => void;
  onSkip: () => void;
}

export function WelcomeModal({ opened, onStart, onSkip }: IWelcomeModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onSkip}
      centered
      size="lg"
      title={<Title order={3}>Hello, Pioneer! 👷</Title>}
    >
      <Stack gap="lg" pb="xs">
        <Text size="sm" c="dark.1" lh={1.55}>
          FICSIT™ welcomes you to Satisfactory Logistics: your off-world
          planning Head Quarter. Blueprint your factories, squeeze every last
          drop out of your production lines and keep the belts flowing.
        </Text>
        <List spacing="sm" size="sm" center>
          <List.Item icon={<IconBuildingFactory size={20} />}>
            Build factories with inputs, outputs and construction progress
          </List.Item>
          <List.Item icon={<IconCalculator size={20} />}>
            Ask the Calculator for the most efficient production chain
          </List.Item>
          <List.Item icon={<IconChartBar size={20} />}>
            Inspect aggregated flows with graph and Sankey charts
          </List.Item>
          <List.Item icon={<IconDeviceGamepad size={20} />}>
            Manage multiple Games and sync them across devices
          </List.Item>
        </List>
        <Text size="sm" c="dark.1" lh={1.55}>
          Shall we take a quick tour of the facility? You can always bail out
          and resume later from the{' '}
          <IconHelp size={16} style={{ verticalAlign: 'text-bottom' }} /> button
          in the header. Stay alert, stay productive.
        </Text>
        <Group justify="flex-end" mt="xs" gap="sm">
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconX size={16} />}
            onClick={onSkip}
          >
            I'll figure it out
          </Button>
          <Button leftSection={<IconPlayerPlay size={16} />} onClick={onStart}>
            Show me around
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
