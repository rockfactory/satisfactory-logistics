import { Group, RingProgress, Text } from '@mantine/core';
import chroma from 'chroma-js';
import { sum } from 'lodash';
import { PercentageFormatter } from '../core/intl/PercentageFormatter';
import { useFactories } from './store/FactoriesSlice';

export interface IFactoryUsageProps {
  /** The _source_ factory (input.factoryId) */
  factoryId: string | null | undefined;
  output: string | null | undefined;
}

const colorScale = chroma
  .scale(['#E03C32', '#e6c111', '#7BB662'])
  .mode('lrgb')
  .padding(-0.1)
  .domain([1, 0]);

export function useOutputUsage(
  options: Pick<IFactoryUsageProps, 'factoryId' | 'output'>,
) {
  const factories = useFactories();
  const source = factories.find(f => f.id === options.factoryId);
  const sourceOutput = source?.outputs?.find(
    o => o.resource === options.output,
  );
  const producedAmount = Math.max(sourceOutput?.amount ?? 1, 0.00001);
  const usedAmount = sum(
    factories.flatMap(
      f =>
        f.inputs
          ?.filter(
            input =>
              input.factoryId === options.factoryId &&
              input.resource === sourceOutput?.resource,
          )
          .map(input => Math.max(0, input.amount ?? 0)) ?? [],
    ),
  );

  let percentage = usedAmount / producedAmount;
  if (Number.isNaN(percentage)) {
    percentage = 0;
  }

  return { percentage, producedAmount, usedAmount };
}

export function FactoryUsage(props: IFactoryUsageProps) {
  const { percentage } = useOutputUsage(props);

  return <BaseFactoryUsage percentage={percentage} />;
}

export function BaseFactoryUsage(props: { percentage: number }) {
  const { percentage } = props;
  return (
    <Group gap={0}>
      <RingProgress
        size={36}
        thickness={6}
        roundCaps
        sections={[
          {
            value: percentage * 100,
            color: colorScale(percentage).hex(),
          },
        ]}
      />
      <Text
        size="xs"
        ta="right"
        fw={'bold'}
        c={colorScale(percentage).hex()}
        w={30}
      >
        {PercentageFormatter.format(percentage)}
      </Text>
    </Group>
  );
}
