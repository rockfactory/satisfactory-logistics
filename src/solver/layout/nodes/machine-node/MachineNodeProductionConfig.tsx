import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import type { FactoryItemId } from '@/recipes/FactoryItemId';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { Group, NumberInput } from '@mantine/core';
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

  const maxSlots = Math.ceil(buildingsAmount) * building.somersloopSlots;

  return (
    <Group wrap="nowrap">
      <NumberInput
        styles={{
          input: {
            fontWeight: somersloopsValue ? 'bold' : 'normal',
            backgroundColor: somersloopsValue
              ? 'var(--mantine-color-grape-5)'
              : undefined,
          },
        }}
        placeholder="Somersloops"
        value={somersloopsValue}
        onChange={setSomersloopsValue}
        min={0}
        max={maxSlots}
        rightSection={
          <FactoryItemImage size={16} id={'Desc_WAT1_C' as FactoryItemId} />
        }
      />
      <NumberInput
        placeholder="Overlock"
        value={overclockValue}
        onChange={setOverclockValue}
        min={0}
        max={2.5}
        rightSection={
          <FactoryItemImage
            size={16}
            id={'Desc_CrystalShard_C' as FactoryItemId}
          />
        }
      />
    </Group>
  );
}
