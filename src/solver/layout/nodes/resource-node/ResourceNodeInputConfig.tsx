import { PercentageFormatter } from '@/core/intl/PercentageFormatter';
import { FactoryInputIcon } from '@/factories/components/peek/icons/OutputInputIcons';
import type { FactoryInput } from '@/factories/Factory';
import { FactoryNumberInput } from '@/factories/inputs/FactoryNumberInput';
import { type FactoryItem } from '@/recipes/FactoryItem';
import { Stack, Text } from '@mantine/core';

export interface IResourceNodeInputConfigProps {
  resource: FactoryItem;
  value: number;
  input: FactoryInput;
  inputAmount?: number | null;
  setInputAmount: (value: number) => void;
}

export function ResourceNodeInputConfig(props: IResourceNodeInputConfigProps) {
  const { resource, value, inputAmount, setInputAmount } = props;

  return (
    <Stack gap="sm" w="100%">
      <FactoryNumberInput
        value={inputAmount ?? 0}
        inputWrapperOrder={['label', 'input', 'description', 'error']}
        placeholder="Amount"
        description={
          <span>
            Using {PercentageFormatter.format(value / (inputAmount ?? 0))} of
            this amount
          </span>
        }
        min={0}
        leftSection={
          resource?.unit ? (
            <Text c="dimmed" size={'10'} pr={4}>
              {resource.unit}
            </Text>
          ) : (
            <FactoryInputIcon size={16} />
          )
        }
        onChange={value => {
          setInputAmount(Number(value));
        }}
      />
    </Stack>
  );
}
