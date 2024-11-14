import type { FormOnChangeHandler } from '@/core/form/useFormOnChange';
import { FactoryOutputIcon } from '@/factories/components/peek/icons/OutputInputIcons';
import type { FactoryOutput } from '@/factories/Factory';
import { FactoryOutputObjectiveSelect } from '@/factories/inputs/output-row/FactoryOutputObjectiveSelect';
import { type FactoryItem } from '@/recipes/FactoryItem';
import { Group, NumberInput, Stack, Text } from '@mantine/core';

export interface IByproductNodeOutputConfigProps {
  resource: FactoryItem | undefined;
  value: number;
  temporaryOutput: FactoryOutput;
  onChangeHandler: FormOnChangeHandler<FactoryOutput>;
}

export function ByproductNodeOutputConfig(
  props: IByproductNodeOutputConfigProps,
) {
  const { resource, value, temporaryOutput, onChangeHandler } = props;

  return (
    <Stack gap="sm" w="100%">
      <Group gap="sm" align="flex-start">
        <NumberInput
          value={temporaryOutput.amount ?? 0}
          inputWrapperOrder={['label', 'input', 'description', 'error']}
          placeholder="Amount"
          description={
            temporaryOutput.objective === 'max' ? (
              <span>Minimum amount to produce in maximization mode</span>
            ) : (
              <span>Amount to produce</span>
            )
          }
          w="180"
          // description={
          //   <span>
          //     Using {PercentageFormatter.format(value / (outputAmount ?? 0))} of
          //     this amount
          //   </span>
          // }
          min={0}
          rightSection={
            resource?.unit ? (
              <Text c="dimmed" size={'10'} pr={4}>
                {resource.unit}
              </Text>
            ) : (
              <FactoryOutputIcon size={16} />
            )
          }
          onChange={onChangeHandler('amount')}
        />
        <FactoryOutputObjectiveSelect
          objective={temporaryOutput.objective}
          onChange={onChangeHandler('objective')}
        />
      </Group>
    </Stack>
  );
}
