import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import type { FactoryItemId } from '@/recipes/FactoryItemId';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { NumberInput, SimpleGrid, Text } from '@mantine/core';
import type { IMachineNodeData } from './MachineNode';

export interface IMachineNodeProductionConfigProps {
  id: string;
  machine: IMachineNodeData;
  buildingsAmount: number;

  // Actions
  overclockValue: string | number;
  setOverclockValue: (value: string | number) => void;
  somersloopsValue: string | number;
  setSomersloopsValue: (value: string | number) => void;
}

export function MachineNodeProductionConfig(
  props: IMachineNodeProductionConfigProps,
) {
  const {
    machine,
    overclockValue,
    setOverclockValue,
    somersloopsValue,
    setSomersloopsValue,
  } = props;

  const building = AllFactoryBuildingsMap[machine.recipe.producedIn];

  const slotsPerBuilding = building.somersloopSlots;
  const somersloopsNum = Number(somersloopsValue) || 0;
  const amplificationPct = slotsPerBuilding > 0
    ? Math.round((somersloopsNum / slotsPerBuilding) * 100 + 100)
    : 100;

  return (
    <SimpleGrid cols={2} spacing={6}>
      <NumberInput
        styles={{
          input: {
            fontWeight: somersloopsValue ? 'bold' : 'normal',
          },
        }}
        placeholder={`0/${slotsPerBuilding}`}
        suffix={`/${slotsPerBuilding}`}
        label={
          somersloopsNum > 0 ? (
            <Text size="xs" fw="bold" c="grape.4">
              {amplificationPct}%
            </Text>
          ) : undefined
        }
        value={somersloopsValue}
        onChange={setSomersloopsValue}
        min={0}
        max={slotsPerBuilding}
        error={
          somersloopsNum > slotsPerBuilding
            ? `Max: ${slotsPerBuilding}`
            : somersloopsNum < 0
              ? 'Cannot be negative'
              : null
        }
        rightSection={
          <FactoryItemImage size={16} id={'Desc_WAT1_C' as FactoryItemId} />
        }
      />
      <NumberInput
        placeholder="Overclock"
        suffix="%"
        value={
          overclockValue === '' || overclockValue == null
            ? ''
            : Number(overclockValue) * 100
        }
        onValueChange={({ floatValue }) =>
          setOverclockValue(
            floatValue == null ? '' : floatValue / 100,
          )
        }
        min={0}
        max={250}
        allowNegative={false}
        error={
          Number(overclockValue) > 2.5
            ? 'Max overclock: 250%'
            : Number(overclockValue) < 0
              ? 'Cannot be negative'
              : null
        }
        rightSection={
          <FactoryItemImage
            size={16}
            id={'Desc_CrystalShard_C' as FactoryItemId}
          />
        }
      />
    </SimpleGrid>
  );
}
