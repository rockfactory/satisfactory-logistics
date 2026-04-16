import { ActionIcon, Group, Stack, Table, Text, Tooltip } from '@mantine/core';
import { IconCalculator, IconEye } from '@tabler/icons-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PercentageFormatter } from '@/core/intl/PercentageFormatter';
import { useShallowStore } from '@/core/zustand';
import type { FactoryOutput } from '@/factories/Factory';

export interface IOutputDependenciesTableProps {
  factoryId: string;
  output: FactoryOutput;
}

export function OutputDependenciesTable(props: IOutputDependenciesTableProps) {
  const { factoryId, output } = props;

  const factoriesUsingOutput = useShallowStore(state =>
    state.games.games[state.games.selected ?? '']?.factoriesIds
      .map(id => state.factories.factories[id])
      .filter(
        factory =>
          factory?.progress !== 'disabled' &&
          factory?.inputs?.some(
            i => i.resource === output.resource && i.factoryId === factoryId,
          ),
      ),
  );

  const dependencies = useMemo(() => {
    return factoriesUsingOutput.flatMap(
      source =>
        source.inputs
          .filter(
            input =>
              input.resource === output.resource &&
              input.factoryId === factoryId,
          )
          .map(input => ({ source, input })) ?? [],
    );
  }, [factoriesUsingOutput, factoryId, output.resource]);

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
            <Table.Td>
              <Group gap="xs" wrap="nowrap">
                <Text size="sm">{source.name}</Text>
                <Tooltip label="Open factory" withArrow>
                  <ActionIcon
                    component={Link}
                    to={`/factories/${source.id}`}
                    size="sm"
                    variant="filled"
                    color="blue"
                    aria-label="Open factory"
                  >
                    <IconEye size={14} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Open calculator" withArrow>
                  <ActionIcon
                    component={Link}
                    to={`/factories/${source.id}/calculator`}
                    size="sm"
                    variant="filled"
                    color="cyan"
                    aria-label="Open calculator"
                  >
                    <IconCalculator size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Table.Td>
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
