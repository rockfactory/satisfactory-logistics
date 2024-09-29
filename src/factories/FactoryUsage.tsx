import { Group, RingProgress, Text } from '@mantine/core';
import chroma from 'chroma-js';
import { sum } from 'lodash';
import { PercentageFormatter } from '../core/intl/PercentageFormatter';
import { useFactories } from './store/FactoriesSlice';

export interface IFactoryUsageProps {
  factoryId: string;
  output: string | null | undefined;
}

const colorScale = chroma
  .scale(['#E03C32', '#e6c111', '#7BB662'])
  .mode('lrgb')
  .padding(-0.1)
  .domain([1, 0]);

export function FactoryUsage(props: IFactoryUsageProps) {
  const factories = useFactories();
  const source = factories.find(f => f.id === props.factoryId);
  const sourceOutput = source?.outputs?.find(o => o.resource === props.output);
  const producedAmount = Math.max(sourceOutput?.amount ?? 1, 0.00001);
  const usedAmount = sum(
    factories.flatMap(
      f =>
        f.inputs
          ?.filter(
            input =>
              input.factoryId === props.factoryId &&
              input.resource === sourceOutput?.resource,
          )
          .map(input => input.amount ?? 0) ?? [],
    ),
  );

  return (
    <Group gap={0}>
      <RingProgress
        size={36}
        thickness={6}
        roundCaps
        sections={[
          {
            value: (usedAmount / producedAmount) * 100,
            color: colorScale(usedAmount / producedAmount).hex(),
          },
        ]}
      />
      <Text
        size="xs"
        ta="right"
        fw={'bold'}
        c={colorScale(usedAmount / producedAmount).hex()}
        w={30}
      >
        {PercentageFormatter.format(usedAmount / producedAmount)}
      </Text>
    </Group>
  );
}
