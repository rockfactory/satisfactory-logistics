import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import { getWorldResourceMachines } from '@/recipes/algorithms/getWorldResourceMachines';
import type { FactoryItemId } from '@/recipes/FactoryItemId';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { Group, Image, Table, Text } from '@mantine/core';
import { sortBy } from 'lodash';
import { useMemo } from 'react';
import type { IResourceNodeData } from './ResourceNode';

export interface IResourceNodeExtractorDetailProps {
  id: string;
  solverId: string;
  data: IResourceNodeData;
}

export function ResourceNodeExtractorDetail(
  props: IResourceNodeExtractorDetailProps,
) {
  const {
    id,
    solverId,
    data: { resource, isRaw: isRaw, value },
  } = props;

  const machines = useMemo(() => {
    return sortBy(getWorldResourceMachines(resource), 'name');
  }, [resource]);

  // const powershards = useStore(
  //   state => state.solvers.instances[solverId ?? '']?.nodes?.[id],
  // );

  return (
    <Table
      withColumnBorders
      style={{
        borderRight: '1px solid var(--mantine-color-dark-4)',
      }}
    >
      <Table.Tbody>
        <Table.Tr>
          <Table.Td colSpan={4}>
            <Text size="sm" fw="bold">
              Extractors
            </Text>
          </Table.Td>
          <Table.Td colSpan={2}>
            <Text size="sm" fw="bold">
              <Group align="center" gap={2}>
                <FactoryItemImage
                  id={'Desc_CrystalShard_C' as FactoryItemId}
                  size={16}
                  highRes
                />
                Overclocked
              </Group>
            </Text>
          </Table.Td>
        </Table.Tr>
        {machines.map((machine, i) => (
          <Table.Tr key={machine.id}>
            <Table.Td>
              <Image
                src={machine.imagePath.replace('_256', '_64')}
                alt={machine.name}
                w={24}
                h={24}
              />
            </Table.Td>
            <Table.Td>
              <Text size="sm">{machine.name}</Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm" fs="italic">
                <RepeatingNumber value={machine.extractor!.itemsPerMinute} />
                /min
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm" fw="bold" inline>
                x
                <RepeatingNumber
                  value={value / machine.extractor!.itemsPerMinute}
                />
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm" fs="italic">
                <RepeatingNumber
                  value={machine.extractor!.itemsPerMinute * 2.5}
                />
                /min
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm" fw="bold">
                x
                <RepeatingNumber
                  value={value / (machine.extractor!.itemsPerMinute * 2.5)}
                />
              </Text>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
