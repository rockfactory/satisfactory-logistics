import { useGameFactories } from '@/games/store/gameFactoriesSelectors';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';
import { Alert, Box, Container, Paper, Text } from '@mantine/core';
import {
  ResponsiveSankey,
  type DefaultLink,
  type DefaultNode,
} from '@nivo/sankey';
import { ErrorBoundary } from '@sentry/react';
import { IconAlertCircle } from '@tabler/icons-react';
import { useMemo } from 'react';

const getResourceName = (resourceId: string) => {
  return AllFactoryItemsMap[resourceId]?.name ?? 'N/A';
};

type Node = DefaultNode & {
  _originalId: string;
};

type Link = DefaultLink & {
  resourceLabel: string;
};

export interface IFactoriesSankeyChartProps {}

export function FactoriesSankeyChart(props: IFactoriesSankeyChartProps) {
  const factories = useGameFactories();

  const data: {
    nodes: Node[];
    links: Link[];
  } = useMemo(() => {
    const nodes: Node[] = factories
      .filter(f => f.name)
      .map(f => ({
        id: f.name!,
        _originalId: f.id,
      }));

    nodes.push({
      id: 'World Resources',
      _originalId: 'WORLD',
    });

    const links: Link[] = factories.flatMap(target => {
      return (target.inputs ?? [])
        .filter(i => i.factoryId && target.name)
        .map(input => ({
          source: nodes.find(n => n._originalId === input.factoryId)?.id ?? '',
          target: target.name!,
          value: input.amount ?? 0,
          resourceLabel: getResourceName(input.resource ?? ''),
        }))
        .filter(l => l.source !== l.target);
    });

    return { nodes, links };
  }, [factories]);

  if (data.nodes.length === 0 || data.links.length === 0) {
    return (
      <Container size="lg" mt={80} mb={100}>
        <Box ta="center">
          <IconAlertCircle size={60} stroke={1.2} />
          <Text size="xl">No factories to display</Text>
          <Text size="sm">
            Add atleast two factories with inputs and outputs to see the chart
          </Text>
        </Box>
      </Container>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <Alert
          title="An error occurred while rendering chart"
          color="red"
          icon={<IconAlertCircle />}
          variant="light"
        >
          Make sure to avoid circular paths in your logistics chain.
        </Alert>
      }
      showDialog
    >
      <ResponsiveSankey
        data={data}
        margin={{
          top: 32,
          bottom: 32,
          left: 32,
          right: 32,
        }}
        linkTooltip={info => {
          return (
            <Paper shadow="sm" radius="sm" p="md">
              <Text size="md">
                {info.link.source.id} → {info.link.target.id}:{' '}
                {info.link.resourceLabel} ({info.link.value})
              </Text>
            </Paper>
          );
        }}
      />
    </ErrorBoundary>
  );
}
