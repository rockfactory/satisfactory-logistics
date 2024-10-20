import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { ActionIcon, Group, Image, NumberInput, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import cx from 'clsx';
import { useState } from 'react';
import { useStore } from '../../../core/zustand';
import { FactoryOutputIcon } from '../../components/peek/icons/OutputInputIcons';
import { OutputDependenciesPeekModal } from '../../components/peek/OutputDependenciesPeekModal';
import { FactoryUsage } from '../../components/usage/FactoryUsage';
import { FactoryOutput } from '../../Factory';
import { useFactoryOnChangeHandler } from '../../store/factoriesSelectors';
import { useIsFactoryVisible } from '../../useIsFactoryVisible';
import { FactoryItemInput } from '../FactoryItemInput';
import classes from './FactoryOutputRow.module.css';

export interface IFactoryOutputRowProps {
  factoryId: string;
  output: FactoryOutput;
  index: number;
}

export function FactoryOutputRow(props: IFactoryOutputRowProps) {
  const { factoryId, output, index } = props;

  const outputs = useStore(
    state => state.factories.factories[factoryId]?.outputs,
  );

  const [amountFocused, setAmountFocused] = useState(false);

  // We use a dedicated onChangeHandler for this component since outputs
  // are synced with solvers
  const onChangeHandler = useFactoryOnChangeHandler(factoryId);

  // TODO IN Solver view, this should be false
  const isVisible = useIsFactoryVisible(factoryId, false, output.resource);
  if (!isVisible) return null;

  const item = output.resource ? AllFactoryItemsMap[output.resource] : null;

  return (
    <Group key={index} gap="sm">
      <FactoryItemInput
        size="sm"
        variant="default"
        width={320}
        value={output.resource}
        onChange={onChangeHandler(`outputs.${index}.resource`)}
      />

      <NumberInput
        className={cx(classes.factoryOutputAmount, {
          [classes.factoryOutputAmountSomersloops]: !!output.somersloops,
        })}
        value={output.amount ?? 0}
        w={100}
        min={0}
        rightSection={
          item?.unit ? (
            <Text c="dimmed" size={'10'} pr={4}>
              {item.unit}
            </Text>
          ) : (
            <FactoryOutputIcon size={16} />
          )
        }
        classNames={{
          input: classes.factoryOutputAmountInput,
        }}
        onBlur={() => setAmountFocused(false)}
        onFocus={() => setAmountFocused(true)}
        onChange={value => {
          useStore.getState().updateFactoryOutput(factoryId, index, {
            amount: Number(value),
          });
        }}
      />
      {/* <Tooltip
        label="Somersloops number. It will double the output amount if set."
        position="top"
        withArrow
      > */}
      <NumberInput
        value={output.somersloops ?? 0}
        w={60}
        min={0}
        variant="filled"
        fw={!output.somersloops ? 'normal' : 'bold'}
        styles={{
          input: {
            color: !output.somersloops ? '' : 'white',
            backgroundColor: !output.somersloops
              ? ''
              : 'var(--mantine-color-grape-5)',
          },
        }}
        onChange={value => {
          useStore.getState().updateFactoryOutput(factoryId, index, {
            somersloops: Number(value),
          });
        }}
        rightSection={
          <Image
            src="/images/somersloop_256_v2.png"
            alt="Somerloops"
            width={20}
            height={20}
          />
        }
      />
      {/* </Tooltip> */}
      <ActionIcon
        variant="outline"
        color="red"
        disabled={outputs?.length === 1}
        size="md"
        onClick={() =>
          useStore.getState().removeFactoryOutput(factoryId, index)
        }
      >
        <IconTrash size={16} stroke={1.5} />
      </ActionIcon>
      <OutputDependenciesPeekModal factoryId={factoryId} output={output} />

      <FactoryUsage factoryId={factoryId} output={output.resource} />
    </Group>
  );
}
