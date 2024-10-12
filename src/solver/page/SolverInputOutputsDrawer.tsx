import { Button, Drawer, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArrowsCross } from '@tabler/icons-react';
import { useStore } from '../../core/zustand';
import {
  FactoryInputIcon,
  FactoryOutputIcon,
} from '../../factories/components/peek/icons/OutputInputIcons';
import { FactoryInputRow } from '../../factories/FactoryInputRow';
import { FactoryOutputRow } from '../../factories/FactoryOutputRow';
import { useFactoryOnChangeHandler } from '../../factories/store/factoriesSelectors';
import { usePathSolverInstance } from '../store/solverSelectors';

export interface ISolverInputOutputsDrawerProps {
  id?: string | null | undefined;
}

export function SolverInputOutputsDrawer(
  props: ISolverInputOutputsDrawerProps,
) {
  const { id } = props;
  const [opened, { open, close }] = useDisclosure();

  const onChangeHandler = useFactoryOnChangeHandler(id);

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
              <FactoryInputRow
                index={i}
                input={input}
                factoryId={id!}
                onChangeHandler={onChangeHandler}
              />
              // <Group gap="xs">
              //   <FactoryItemInput
              //     value={input.resource ?? undefined}
              //     onChange={onChangeHandler(`inputs.${i}.resource`)}
              //     placeholder="Resource"
              //     size="sm"
              //   />
              //   <NumberInput
              //     value={input.amount ?? undefined}
              //     onChange={onChangeHandler(`inputs.${i}.amount`)}
              //     placeholder="Amount"
              //     size="sm"
              //     min={0}
              //   />
              //   <ActionIcon
              //     size="sm"
              //     variant="outline"
              //     color="red"
              //     onClick={() => {
              //       useStore.getState().removeFactoryInput(id!, i);
              //     }}
              //   >
              //     <IconTrash size={16} stroke={1.5} />
              //   </ActionIcon>
              // </Group>
            ))}
            <Button
              w="100%"
              size="sm"
              leftSection={<FactoryInputIcon />}
              color="blue"
              variant="light"
              onClick={() => {
                useStore.getState().addFactoryInput(id!);
              }}
            >
              Add Input
            </Button>
          </Stack>
          <Stack gap="sm">
            <Text size="lg">Outputs</Text>
            {instance?.request?.outputs.map((output, i) => (
              <FactoryOutputRow
                index={i}
                output={output}
                factoryId={id!}
                onChangeHandler={onChangeHandler}
              />
              // <Group gap="xs">
              //   <FactoryItemInput
              //     value={output.resource ?? undefined}
              //     onChange={onChangeHandler(`outputs.${i}.resource`)}
              //     placeholder="Resource"
              //     size="sm"
              //   />
              //   <NumberInput
              //     value={output.amount ?? undefined}
              //     onChange={onChangeHandler(`outputs.${i}.amount`)}
              //     placeholder="Amount"
              //     size="sm"
              //     min={0}
              //   />
              //   <ActionIcon
              //     size="sm"
              //     variant="outline"
              //     color="red"
              //     onClick={() => {
              //       useStore.getState().removeFactoryOutput(id!, i);
              //     }}
              //   >
              //     <IconTrash size={16} stroke={1.5} />
              //   </ActionIcon>
              // </Group>
            ))}
            <Button
              w="100%"
              size="sm"
              color="blue"
              variant="filled"
              leftSection={<FactoryOutputIcon />}
              onClick={() => {
                useStore.getState().addFactoryOutput(id!);
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
