import {
  ActionIcon,
  Button,
  Drawer,
  Group,
  NumberInput,
  Stack,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArrowsCross, IconTrash } from '@tabler/icons-react';
import { useDispatch } from 'react-redux';
import {
  FactoryInputIcon,
  FactoryOutputIcon,
} from '../../../factories/components/peek/icons/OutputInputIcons';
import { FactoryItemInput } from '../../../factories/inputs/FactoryItemInput';
import { solverActions, usePathSolverInstance } from '../store/SolverSlice';

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
  const dispatch = useDispatch();
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
            {instance?.request?.inputs?.map((input, i) => (
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
                <ActionIcon
                  size="sm"
                  variant="outline"
                  color="red"
                  onClick={() => {
                    dispatch(
                      solverActions.removeInput({ id: instance!.id, index: i }),
                    );
                  }}
                >
                  <IconTrash size={16} stroke={1.5} />
                </ActionIcon>
              </Group>
            ))}
            <Button
              w="100%"
              size="sm"
              leftSection={<FactoryInputIcon />}
              onClick={() => {
                dispatch(solverActions.addInput({ id: instance!.id }));
              }}
            >
              Add Input
            </Button>
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
                <ActionIcon
                  size="sm"
                  variant="outline"
                  color="red"
                  onClick={() => {
                    dispatch(
                      solverActions.removeOutput({
                        id: instance!.id,
                        index: i,
                      }),
                    );
                  }}
                >
                  <IconTrash size={16} stroke={1.5} />
                </ActionIcon>
              </Group>
            ))}
            <Button
              w="100%"
              size="sm"
              rightSection={<FactoryOutputIcon />}
              onClick={() => {
                dispatch(solverActions.addOutput({ id: instance!.id }));
              }}
            >
              Add Output
            </Button>
          </Stack>
        </Stack>
      </Drawer>
    </>
  );
}
