import { Stack, Table, Text } from '@mantine/core';
import { PercentageFormatter } from '../../../core/intl/PercentageFormatter';
import { useShallowStore } from '../../../core/zustand';
import { FactoryOutput } from '../../Factory';

export interface IOutputDependenciesTableProps {
  factoryId: string;
  output: FactoryOutput;
}

export function OutputDependenciesTable(props: IOutputDependenciesTableProps) {
  const { factoryId, output } = props;
  const dependencies = useShallowStore(state => {
    return state.games.games[state.games.selected ?? '']?.factoriesIds
      .map(id => state.factories.factories[id])
      .flatMap(source => {
        return (
          source?.inputs
            ?.filter(
              i =>
                i?.resource === output.resource && i?.factoryId === factoryId,
            )
            .map(input => ({ source, input })) ?? []
        );
      });
  });

  if (dependencies.length === 0)
    return (
      <div>
        <Stack gap="xs" justify="center" align="center">
          No dependencies found.
          <Text size="xs" ta="center" c="dimmed">
            Add a factory that uses this output as an input.
          </Text>
        </Stack>
      </div>
    );

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
