import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import type {
  SolverAreaNode,
  SolverEnergyNode,
} from '@/solver/algorithm/SolverNode';
import { Button, Drawer, Group, Stack, Table, Tabs, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconInfoHexagon,
  IconPower,
  IconRulerMeasure,
} from '@tabler/icons-react';
import { Node } from '@xyflow/react';
import { useMemo } from 'react';
import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { IMachineNodeData } from '@/solver/layout/nodes/machine-node/MachineNode';
import { IResourceNodeData } from '@/solver/layout/nodes/resource-node/ResourceNode';
import { usePathSolverInstance } from '@/solver/store/solverSelectors';
import { SummaryBuildings } from './SummaryBuildings';
import { ISolverSolution } from '@/solver/page/ISolverSolution';

export interface ISolverSummaryDrawerProps {
  id: string;
  solution: ISolverSolution;
}

export function SolverSummaryDrawer(props: ISolverSummaryDrawerProps) {
  const { solution } = props;
  const [opened, { open, close }] = useDisclosure();
  const instance = usePathSolverInstance(props.id);

  const stats = useMemo(() => {
    const machineNodes = solution.nodes.filter(
      (node): node is Node<IMachineNodeData, 'Machine'> =>
        node.type === 'Machine',
    );

    // Power
    const power = machineNodes.reduce((acc, node) => {
      const energyNode = solution.graph.getNodeAttributes(
        `e${node.data.recipe.index}`,
      ) as SolverEnergyNode;
      return acc + (energyNode.value ?? 0);
    }, 0);

    // Area
    const area = machineNodes.reduce((acc, node) => {
      const areaNode = solution.graph.getNodeAttributes(
        // TODO Find a better way to encode node names
        `area${node.data.recipe.index}`,
      ) as SolverAreaNode;
      return acc + (areaNode.value ?? 0);
    }, 0);

    // All resources
    const resources = solution.nodes
      .filter(
        (node): node is Node<IResourceNodeData, 'Resource'> =>
          node.type === 'Resource',
      )
      .reduce(
        (acc, node) => {
          if (!acc[node.data.resource.id]) {
            acc[node.data.resource.id] = 0;
          }
          acc[node.data.resource.id] += node.data.value;
          return acc;
        },
        {} as Record<string, number>,
      );

    return {
      power,
      area,
      resources,
    };
  }, [solution]);

  return (
    <>
      <Button
        size="sm"
        variant="filled"
        // color="cyan"
        leftSection={<IconInfoHexagon size={16} />}
        onClick={open}
      >
        Summary
      </Button>
      <Drawer
        position="right"
        size="lg"
        opened={opened}
        onClose={close}
        title={
          <Stack>
            <Text size="xl">Summary</Text>
          </Stack>
        }
      >
        <Stack gap="md">
          <Group justify="space-between">
            <Group gap={4}>
              <IconPower size={32} stroke={1.5} />
              <Text size="lg">Power</Text>
            </Group>
            <Group gap={4}>
              <Text size="lg" fw={600}>
                <RepeatingNumber value={stats.power} /> MW
              </Text>
            </Group>
            <Group gap={4}>
              <IconRulerMeasure size={32} stroke={1.5} />
              <Text size="lg">Area</Text>
            </Group>
            <Group gap={4}>
              <Text size="lg" fw={600}>
                <RepeatingNumber value={stats.area} /> m<sup>2</sup>
              </Text>
            </Group>
          </Group>
          <Tabs variant="outline" defaultValue="resources">
            <Tabs.List>
              <Tabs.Tab value="resources">Resources</Tabs.Tab>
              <Tabs.Tab value="buildings">Buildings</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="resources">
              {/* <Title order={5}>Resources</Title> */}
              <Table withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th></Table.Th>
                    <Table.Th>Resource</Table.Th>
                    <Table.Th>Amount</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {Object.entries(stats.resources).map(([id, value]) => {
                    const resource = AllFactoryItemsMap[id];
                    return (
                      <Table.Tr key={id}>
                        <Table.Td width="40px">
                          <FactoryItemImage size={32} id={resource.id} />
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{resource.name}</Text>
                        </Table.Td>
                        <Table.Td>
                          <RepeatingNumber value={value} />
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Tabs.Panel>
            <Tabs.Panel value="buildings">
              <SummaryBuildings solution={solution} />
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Drawer>
    </>
  );
}
