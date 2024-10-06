import { Button, Drawer, Group, NumberInput, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArrowsCross } from '@tabler/icons-react';
import { FactoryItemInput } from '../../../factories/inputs/FactoryItemInput';
import { usePathSolverInstance } from '../store/SolverSlice';

export interface ISolverInputOutputsDrawerProps {
  onChangeSolver: (
    path: string,
  ) => (
    value: string | null | number | React.ChangeEvent<HTMLInputElement>,
  ) => void;
}

export function SolverInputOutputsDrawer(
  props: ISolverInputOutputsDrawerProps,
) {
  const { onChangeSolver } = props;
  const [opened, { open, close }] = useDisclosure();
  const instance = usePathSolverInstance();

  return (
    <>
      <Button
        size="sm"
        variant="filled"
        leftSection={<IconArrowsCross size={16} />}
        onClick={open}
      >
        Inputs / Outputs
      </Button>
      <Drawer
        position="right"
        size="lg"
        opened={opened}
        onClose={close}
        title={
          <Stack>
            <Text size="xl">Inputs & Outputs</Text>
          </Stack>
        }
      >
        <Stack gap="md">
          <Stack gap="sm">
            <Text size="lg">Inputs</Text>
            {instance?.request?.inputs.map((input, i) => (
              <Group gap="xs">
                <FactoryItemInput
                  value={input.item ?? undefined}
                  onChange={onChangeSolver(`request.inputs.${i}.item`)}
                  placeholder="Resource"
                  size="sm"
                />
                <NumberInput
                  value={input.amount ?? undefined}
                  onChange={onChangeSolver(`request.inputs.${i}.amount`)}
                  placeholder="Amount"
                  size="sm"
                  min={0}
                />
              </Group>
            ))}
          </Stack>
          <Stack gap="sm">
            <Text size="lg">Outputs</Text>
            {instance?.request?.outputs.map((output, i) => (
              <Group gap="xs">
                <FactoryItemInput
                  value={output.item ?? undefined}
                  onChange={onChangeSolver(`request.outputs.${i}.item`)}
                  placeholder="Resource"
                  size="sm"
                />
                <NumberInput
                  value={output.amount ?? undefined}
                  onChange={onChangeSolver(`request.outputs.${i}.amount`)}
                  placeholder="Amount"
                  size="sm"
                  min={0}
                />
              </Group>
            ))}
          </Stack>
        </Stack>
      </Drawer>
    </>
  );
}
