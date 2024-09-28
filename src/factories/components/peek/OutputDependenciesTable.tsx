import { Table } from '@mantine/core';
import { useMemo } from 'react';
import { PercentageFormatter } from '../../../core/intl/PercentageFormatter';
import { GameFactoryOutput, useFactories } from '../../store/FactoriesSlice';

export interface IOutputDependenciesTableProps {
  factoryId: string;
  output: GameFactoryOutput;
}

export function OutputDependenciesTable(props: IOutputDependenciesTableProps) {
  const { factoryId, output } = props;
  const factories = useFactories();
  const dependencies = useMemo(() => {
    if (!output.resource) return [];
    return factories.flatMap(
      source =>
        source.inputs
          ?.filter(
            i => i.resource === output.resource && i.factoryId == factoryId,
          )
          .map(input => ({ source, input })) ?? [],
    );
  }, [factories, factoryId, output]);

  return (
    <div>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Source</Table.Th>
            <Table.Th>Amount</Table.Th>
            <Table.Th>Percentage of output</Table.Th>
          </Table.Tr>
        </Table.Thead>
        {dependencies.map(({ source, input }) => (
          <Table.Tr key={source.id}>
            <Table.Td>{source.name}</Table.Td>
            <Table.Td>
              {input.amount}
              <small>/min</small>
            </Table.Td>
            <Table.Td>
              {PercentageFormatter.format(
                (input.amount ?? 0) / (output.amount ?? 1),
              )}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table>
    </div>
  );
}
