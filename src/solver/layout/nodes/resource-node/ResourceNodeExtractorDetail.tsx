import { Group, Image, Table, Text } from '@mantine/core';
import { sortBy } from 'lodash';
import React, { useMemo } from 'react';
import { assetPath } from '@/core/assetPath';
import { RepeatingNumber } from '@/core/intl/NumberFormatter';
import { getWorldResourceMachines } from '@/recipes/algorithms/getWorldResourceMachines';
import type { FactoryItemId } from '@/recipes/FactoryItemId';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import type { IResourceNodeData } from './ResourceNode';

const PURITIES = [
  { label: 'Impure', multiplier: 0.5 },
  { label: 'Normal', multiplier: 1 },
  { label: 'Pure', multiplier: 2 },
] as const;

const CLOCK_SPEEDS = [1, 2.5] as const;

export interface IResourceNodeExtractorDetailProps {
  id: string;
  solverId: string;
  data: IResourceNodeData;
}

export function ResourceNodeExtractorDetail(
  props: IResourceNodeExtractorDetailProps,
) {
  const {
    data: { resource, value },
  } = props;

  const machines = useMemo(() => {
    return sortBy(getWorldResourceMachines(resource), 'name');
  }, [resource]);

  return (
    <Table
      withColumnBorders
      style={{
        borderRight: '1px solid var(--mantine-color-dark-4)',
      }}
    >
      <Table.Thead>
        <Table.Tr>
          <Table.Th colSpan={2} rowSpan={2}>
            <Text size="sm" fw="bold">
              Extractors
            </Text>
          </Table.Th>
          {PURITIES.map(purity => (
            <Table.Th
              key={purity.label}
              colSpan={CLOCK_SPEEDS.length}
              style={{ textAlign: 'center' }}
            >
              <Text size="xs" fw="bold">
                {purity.label}
              </Text>
            </Table.Th>
          ))}
        </Table.Tr>
        <Table.Tr>
          {PURITIES.map(purity => (
            <React.Fragment key={`${purity.label}-sub`}>
              {CLOCK_SPEEDS.map(speed => (
                <Table.Th
                  key={`${purity.label}-${speed}`}
                  style={{ textAlign: 'center' }}
                >
                  {speed > 1 ? (
                    <Group align="center" gap={2} justify="center">
                      <FactoryItemImage
                        id={'Desc_CrystalShard_C' as FactoryItemId}
                        size={12}
                      />
                      <Text size="xs" c="dimmed">
                        {speed * 100}%
                      </Text>
                    </Group>
                  ) : (
                    <Group align="center" gap={2} justify="center">
                      <FactoryItemImage
                        id={'Desc_CrystalShard_C' as FactoryItemId}
                        size={12}
                      />
                      <Text size="xs" c="dimmed">
                        {speed * 100}%
                      </Text>
                    </Group>
                  )}
                </Table.Th>
              ))}
            </React.Fragment>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {machines.map(machine => {
          const baseRate = machine.extractor!.itemsPerMinute;
          return (
            <Table.Tr key={machine.id}>
              <Table.Td>
                <Image
                  src={assetPath(machine.imagePath.replace('_256', '_64'))}
                  alt={machine.name}
                  w={24}
                  h={24}
                />
              </Table.Td>
              <Table.Td>
                <Text size="sm">{machine.name}</Text>
              </Table.Td>
              {PURITIES.map(purity =>
                CLOCK_SPEEDS.map(speed => (
                  <Table.Td key={`${purity.label}-${speed}`}>
                    <Text size="xs" fs="italic">
                      <RepeatingNumber
                        value={baseRate * purity.multiplier * speed}
                      />
                      /min
                    </Text>
                    <Text size="sm" fw="bold">
                      x
                      <RepeatingNumber
                        value={value / (baseRate * purity.multiplier * speed)}
                      />
                    </Text>
                  </Table.Td>
                )),
              )}
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
