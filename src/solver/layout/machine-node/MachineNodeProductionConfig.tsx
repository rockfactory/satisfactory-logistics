import { useStore } from '@/core/zustand';
import { AllFactoryBuildingsMap } from '@/recipes/FactoryBuilding';
import type { FactoryItemId } from '@/recipes/FactoryItemId';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import type { SolverNodeState } from '@/solver/store/Solver';
import { Group, NumberInput } from '@mantine/core';
import { useParams } from 'react-router-dom';
import type { IMachineNodeData } from '../MachineNode';

export interface IMachineNodeProductionConfigProps {
  id: string;
  machine: IMachineNodeData;
  buildingsAmount: number;
  nodeState: SolverNodeState | null | undefined;
}

export function MachineNodeProductionConfig(
  props: IMachineNodeProductionConfigProps,
) {
  const { nodeState, machine, buildingsAmount, id } = props;
  const building = AllFactoryBuildingsMap[machine.recipe.producedIn];
  const solverId = useParams<{ id: string }>().id;

  //   console.log(
  //     'nodeState is',
  //     nodeState,
  //     buildingsAmount,
  //     building,
  //     'max is',
  //     Math.ceil(buildingsAmount) * building.somersloopSlots,
  //   );

  const maxSlots = Math.ceil(buildingsAmount) * building.somersloopSlots;

  return (
    <Group wrap="nowrap">
      <NumberInput
        styles={{
          input: {
            fontWeight: nodeState?.somersloops ? 'bold' : 'normal',
            backgroundColor: nodeState?.somersloops
              ? 'var(--mantine-color-grape-5)'
              : undefined,
          },
        }}
        placeholder="Somersloops"
        value={nodeState?.somersloops ?? 0}
        onChange={value => {
          useStore.getState().updateSolverNode(solverId!, id, node => {
            node.somersloops = value ? Number(value) : undefined;
            node.amplification = node.somersloops
              ? node.somersloops / maxSlots
              : undefined;
          });
        }}
        min={0}
        max={maxSlots}
        rightSection={
          <FactoryItemImage size={16} id={'Desc_WAT1_C' as FactoryItemId} />
        }
      />
      <NumberInput
        placeholder="Overlock"
        value={nodeState?.overclock ?? 1}
        onChange={value => {
          useStore.getState().updateSolverNode(solverId!, id, node => {
            node.overclock = value ? Number(value) : undefined;
          });
        }}
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
