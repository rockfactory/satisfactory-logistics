import { Alert, Box, Container, Paper, Text } from '@mantine/core';
import { DefaultLink, DefaultNode, ResponsiveSankey } from '@nivo/sankey';
import { ErrorBoundary } from '@sentry/react';
import { IconAlertCircle } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useGameFactories } from '../../games/store/gameFactoriesSelectors';
import { AllFactoryItemsMap } from '../../recipes/FactoryItem';

export interface IChartsTabProps {}

const getResourceName = (resourceId: string) => {
  return AllFactoryItemsMap[resourceId]?.name ?? 'N/A';
};

type Node = DefaultNode & {
  _originalId: string;
};

type Link = DefaultLink & {
  resourceLabel: string;
};

export function ChartsTab(_props: IChartsTabProps) {
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
        }));
    });

    return { nodes, links };
  }, [factories]);

  if (
    factories.length === 0 ||
    data.nodes.length === 0 ||
    data.links.length === 0
  ) {
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
    <div>
      <Container size="lg" mt="lg" mb={100}>
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
          <Box h={400}>
            <ResponsiveSankey
              data={data}
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
          </Box>
        </ErrorBoundary>
      </Container>
    </div>
  );
}
