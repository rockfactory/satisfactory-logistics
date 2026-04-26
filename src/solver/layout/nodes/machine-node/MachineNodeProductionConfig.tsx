import { NumberInput, SimpleGrid, Text } from '@mantine/core';
import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import type { FactoryItemId } from '@/recipes/FactoryItemId';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import type { IMachineNodeData } from './MachineNode';
import { roundOverclock } from './roundOverclock';

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
  const amplificationPct =
    slotsPerBuilding > 0
      ? Math.round((somersloopsNum / slotsPerBuilding) * 100 + 100)
      : 100;

  return (
    <SimpleGrid
      data-tutorial-id="machine-action-overclock-somersloops"
      cols={2}
      spacing={6}
    >
      <NumberInput
        styles={{
          input: {
            fontWeight: somersloopsValue ? 'bold' : 'normal',
          },
        }}
        placeholder={`0/${slotsPerBuilding}`}
        suffix={`/${slotsPerBuilding}`}
        label={
          <Text
            size="xs"
            fw="bold"
            c="grape.4"
            style={{
              visibility: somersloopsNum > 0 ? 'visible' : 'hidden',
            }}
          >
            {somersloopsNum > 0 ? `${amplificationPct}%` : '\u00A0'}
          </Text>
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
        data-tutorial-id="machine-action-overclock"
        label={
          <Text size="xs" style={{ visibility: 'hidden' }}>
            {'\u00A0'}
          </Text>
        }
        placeholder="Overclock"
        suffix="%"
        value={
          overclockValue === '' || overclockValue == null
            ? ''
            : // Round to 4 decimal places on the percent scale so values like
              // 2.24 don't render as 224.00000000000003 from float pollution.
              Math.round(Number(overclockValue) * 100 * 10000) / 10000
        }
        onValueChange={({ floatValue }) =>
          setOverclockValue(
            floatValue == null ? '' : roundOverclock(floatValue / 100),
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
