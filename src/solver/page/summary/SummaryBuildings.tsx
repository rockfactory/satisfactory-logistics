import { Group, Image, Stack, Table, Text } from '@mantine/core';
import { groupBy, sum } from 'lodash';
import { useMemo } from 'react';
import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { OverclockImage } from '@/recipes/ui/OverclockImage';
import { SomersloopImage } from '@/recipes/ui/SomsersloopImage';
import type { IMachineNodeData } from '@/solver/layout/nodes/machine-node/MachineNode';
import { calculateMachineNodeBuildings } from '@/solver/layout/nodes/machine-node/postprocess/calculateMachineNodeBuildings';
import type { ISolverSolution } from '@/solver/page/ISolverSolution';
import classes from './SummaryBuildings.module.css';

export interface ISummaryBuildingsProps {
  solution: ISolverSolution;
}

export function SummaryBuildings(props: ISummaryBuildingsProps) {
  const { solution } = props;

  const groupedByBuilding = useMemo(
    () =>
      Object.entries(
        groupBy(
          solution.nodes
            .filter(node => node.type === 'Machine')
            .map(node =>
              calculateMachineNodeBuildings(
                node.data as IMachineNodeData,
                solution.context.request.nodes?.[node.id],
              ),
            ),
          data => data.building.id,
        ),
      ).map(([buildingId, data]) => ({
        buildingId,
        data,
      })),
    [solution],
  );

  return (
    <Stack gap="xs">
      {groupedByBuilding.map(({ buildingId, data }) => (
        <>
          <Group gap="xs" className={classes.building}>
            <Image src={data[0].building.imagePath} w={24} h={24} />
            <span>{sum(data.map(node => node.roundedBuildingsAmount))}x</span>
            {data[0].building.name}
          </Group>
          <Table withRowBorders withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={60}>#</Table.Th>
                <Table.Th>Recipe</Table.Th>
                <Table.Th w={160}>
                  <Group gap={2}>
                    <OverclockImage size={24} /> Overclock
                  </Group>
                </Table.Th>
                <Table.Th w={140}>
                  <Group gap={2}>
                    <SomersloopImage size={24} /> Somersloops
                  </Group>
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.map(node => (
                <>
                  {node.fullBuildingsAmount > 0 && (
                    <Table.Tr>
                      <Table.Td>
                        <RepeatingNumber value={node.fullBuildingsAmount} />
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <FactoryItemImage size={24} id={node.product.id} />
                          {node.product.name}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={6} wrap="nowrap">
                          <span>
                            <RepeatingNumber value={node.overclock * 100} />%
                          </span>
                          {node.powerShardsPerMachine > 0 && (
                            <Group gap={2} wrap="nowrap" c="dimmed">
                              <Text size="sm">
                                ·{' '}
                                {node.powerShardsPerMachine *
                                  node.fullBuildingsAmount}
                              </Text>
                              <OverclockImage size={14} />
                            </Group>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        {node.somersloopsPerMachine}/
                        {node.building.somersloopSlots}
                      </Table.Td>
                    </Table.Tr>
                  )}
                  {node.partialBuildingAmount > Number.EPSILON && (
                    <Table.Tr>
                      <Table.Td>
                        <RepeatingNumber value={node.partialBuildingAmount} />
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <FactoryItemImage size={24} id={node.product.id} />
                          {node.product.name}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={6} wrap="nowrap">
                          <span>
                            <RepeatingNumber
                              value={node.partialBuildingOverclock * 100}
                            />
                            %
                          </span>
                          {node.partialBuildingPowerShards > 0 && (
                            <Group gap={2} wrap="nowrap" c="dimmed">
                              <Text size="sm">
                                ·{' '}
                                {node.partialBuildingPowerShards *
                                  node.partialBuildingAmount}
                              </Text>
                              <OverclockImage size={14} />
                            </Group>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        {node.somersloopsPerMachine}/
                        {node.building.somersloopSlots}
                      </Table.Td>
                    </Table.Tr>
                  )}
                </>
              ))}
            </Table.Tbody>
          </Table>
        </>
      ))}
    </Stack>
  );
}
