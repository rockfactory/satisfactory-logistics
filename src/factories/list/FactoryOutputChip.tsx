import { Group, Text } from '@mantine/core';
import clsx from 'clsx';
import { PercentageFormatter } from '@/core/intl/PercentageFormatter';
import {
  isOverused as isUsageOver,
  useOutputUsage,
} from '@/factories/components/usage/useOutputUsage';
import type { FactoryOutput } from '@/factories/Factory';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import classes from './FactoryGridCard.module.css';

export interface IFactoryOutputChipProps {
  factoryId: string;
  output: FactoryOutput;
  /** Disabled factories never highlight their outputs. */
  disabled?: boolean;
}

export function FactoryOutputChip(props: IFactoryOutputChipProps) {
  const { factoryId, output, disabled = false } = props;
  const { percentage } = useOutputUsage({
    factoryId,
    output: output.resource,
  });
  // Infinity (nothing produced but something consumed) also counts as overused.
  const isOverused = !disabled && isUsageOver(percentage);

  return (
    <Group
      gap={6}
      wrap="nowrap"
      className={clsx(classes.outputChip, isOverused && classes.overused)}
      title={
        isOverused
          ? `Overused: ${PercentageFormatter.format(percentage)}`
          : undefined
      }
    >
      <FactoryItemImage id={output.resource} size={24} />
      <Text size="xs">&times;</Text>
      <Text size="xs">{output.amount}</Text>
    </Group>
  );
}
