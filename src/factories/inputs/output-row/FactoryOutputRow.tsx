import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import {
  ActionIcon,
  Group,
  Image,
  NumberInput,
  Text,
  Tooltip,
} from '@mantine/core';
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
  displayMode?: 'solver' | 'factory';
}

export function FactoryOutputRow(props: IFactoryOutputRowProps) {
  const { factoryId, output, index, displayMode = 'factory' } = props;

  const outputsCount = useStore(
    state => state.factories.factories[factoryId]?.outputs?.length ?? 0,
  );

  const [amountFocused, setAmountFocused] = useState(false);

  // We use a dedicated onChangeHandler for this component since outputs
  // are synced with solvers
  const onChangeHandler = useFactoryOnChangeHandler(factoryId);

  const isVisible = useIsFactoryVisible(factoryId, false, output.resource);
  if (!isVisible && displayMode === 'factory') return null;

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
      <Tooltip
        label="Somersloops tracking for this output. Will automatically be set here if you add some somersloops in the calculator"
        position="top"
        color="dark.8"
        withArrow
      >
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
              src="/images/game/wat-1_256.png"
              alt="Somerloops"
              width={20}
              height={20}
            />
          }
        />
      </Tooltip>
      <ActionIcon
        variant="outline"
        color="red"
        disabled={outputsCount === 1}
        size="md"
        onClick={() =>
          useStore.getState().removeFactoryOutput(factoryId, index)
        }
      >
        <IconTrash size={16} stroke={1.5} />
      </ActionIcon>

      {/*
      Currently disabled, we need to implement a better way to compute it
       */}
      {/* <FactoryOutputObjectiveSelect
        output={output}
        onChange={onChangeHandler(`outputs.${index}.objective`)}
      /> */}

      <OutputDependenciesPeekModal factoryId={factoryId} output={output} />

      <FactoryUsage factoryId={factoryId} output={output.resource} />
    </Group>
  );
}
