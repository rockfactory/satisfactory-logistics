import { Group, RingProgress, Text } from '@mantine/core';
import chroma from 'chroma-js';
import { PercentageFormatter } from '@/core/intl/PercentageFormatter';
import { useGameSettings } from '@/games/gamesSlice';
import { useOutputUsage } from './useOutputUsage';

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

export function FactoryUsage(props: IFactoryUsageProps) {
  const { percentage } = useOutputUsage(props);

  return <BaseFactoryUsage percentage={percentage} />;
}

export interface IBaseFactoryUsageProps {
  percentage: number;
  size?: number;
  thickness?: number;
  textWidth?: number;
}

export function BaseFactoryUsage(props: IBaseFactoryUsageProps) {
  const { percentage, size = 36, thickness = 6, textWidth = 30 } = props;
  const settings = useGameSettings();
  const is100Percent = Math.abs(percentage - 1) < Number.EPSILON;
  const color =
    is100Percent && !settings?.noHighlight100PercentUsage
      ? (settings?.highlight100PercentColor ?? '#339af0')
      : colorScale(percentage).hex();

  return (
    <Group gap={0} wrap="nowrap">
      <RingProgress
        size={size}
        thickness={thickness}
        roundCaps
        sections={[
          {
            value: percentage * 100,
            color: color,
          },
        ]}
      />
      <Text size="xs" ta="right" fw={'bold'} c={color} w={textWidth}>
        {PercentageFormatter.format(percentage)}
      </Text>
    </Group>
  );
}
