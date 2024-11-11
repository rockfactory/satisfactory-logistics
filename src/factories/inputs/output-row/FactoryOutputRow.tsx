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
import { FactoryNumberInput } from '../FactoryNumberInput';
import { FactoryOutputObjectiveSelect } from './FactoryOutputObjectiveSelect';
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

      <Tooltip
        disabled={output.objective !== 'max'}
        label={
          output.objective === 'max'
            ? 'In this mode, the amount will be used as a minimum amount to produce'
            : null
        }
      >
        <FactoryNumberInput
          className={cx(classes.factoryOutputAmount, {
            [classes.factoryOutputAmountSomersloops]: !!output.somersloops,
          })}
          value={output.amount ?? 0}
          w={110}
          min={0}
          allowNegative={false}
          leftSection={
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
      </Tooltip>

      <Tooltip
        label="Somersloops tracking for this output. Will automatically be set here if you add some somersloops in the calculator"
        position="top"
        color="dark.8"
        withArrow
      >
        <NumberInput
          value={output.somersloops ?? 0}
          w={80}
          min={0}
          allowNegative={false}
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
          leftSection={
            <Image
              src="/images/game/wat-1_256.png"
              alt="Somerloops"
              width={20}
              height={20}
            />
          }
        />
      </Tooltip>

      {displayMode === 'solver' && (
        <FactoryOutputObjectiveSelect
          objective={output.objective}
          onChange={onChangeHandler(`outputs.${index}.objective`)}
        />
      )}

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

      <OutputDependenciesPeekModal factoryId={factoryId} output={output} />

      <FactoryUsage factoryId={factoryId} output={output.resource} />
    </Group>
  );
}
