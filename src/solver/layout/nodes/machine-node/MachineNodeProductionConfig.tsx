import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import type { FactoryItemId } from '@/recipes/FactoryItemId';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { NumberInput, SimpleGrid } from '@mantine/core';
import { useParams } from 'react-router-dom';
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
    buildingsAmount,
    id,
    overclockValue,
    setOverclockValue,
    somersloopsValue,
    setSomersloopsValue,
  } = props;

  const building = AllFactoryBuildingsMap[machine.recipe.producedIn];
  const solverId = useParams<{ id: string }>().id;

  const maxSlots =
    Math.ceil(buildingsAmount - 0.0001) * building.somersloopSlots;

  return (
    <SimpleGrid cols={2} spacing={6}>
      <NumberInput
        styles={{
          input: {
            fontWeight: somersloopsValue ? 'bold' : 'normal',
            // backgroundColor: somersloopsValue
            //   ? 'var(--mantine-color-grape-5)'
            //   : undefined,
          },
        }}
        placeholder="Somersloops"
        value={somersloopsValue}
        onChange={setSomersloopsValue}
        min={0}
        max={maxSlots}
        error={
          Number(somersloopsValue) > maxSlots
            ? `Max slots: ${maxSlots}`
            : Number(somersloopsValue) < 0
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
