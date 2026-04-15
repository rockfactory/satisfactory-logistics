import {
  ActionIcon,
  Alert,
  Box,
  Container,
  Group,
  Tooltip as MantineTooltip,
  Paper,
  Stack,
  Text,
} from '@mantine/core';
import {
  type DefaultLink,
  type DefaultNode,
  ResponsiveSankey,
} from '@nivo/sankey';
import { ErrorBoundary } from '@sentry/react';
import { IconAlertCircle, IconCalculator, IconEye } from '@tabler/icons-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGameFactories } from '@/games/store/gameFactoriesSelectors';
import { AllFactoryItemsMap } from '@/recipes/FactoryItem';

const getResourceName = (resourceId: string) => {
  return AllFactoryItemsMap[resourceId]?.name ?? 'N/A';
};

type SankeyNode = DefaultNode & {
  _originalId: string;
};

type SankeyLink = DefaultLink & {
  resourceLabel: string;
};

export interface IFactoriesSankeyChartProps {}

export function FactoriesSankeyChart(props: IFactoriesSankeyChartProps) {
  const factories = useGameFactories();
  const navigate = useNavigate();

  const data: {
    nodes: SankeyNode[];
    links: SankeyLink[];
  } = useMemo(() => {
    const nodes: SankeyNode[] = factories
      .filter(f => f.name)
      .map(f => ({
        id: f.name!,
        _originalId: f.id,
      }));

    nodes.push({
      id: 'World Resources',
      _originalId: 'WORLD',
    });

    const links: SankeyLink[] = factories.flatMap(target => {
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
        onClick={(datum: any) => {
          const node = datum as SankeyNode | undefined;
          if (
            node &&
            typeof node._originalId === 'string' &&
            node._originalId !== 'WORLD'
          ) {
            navigate(`/factories/${node._originalId}`);
          }
        }}
        nodeTooltip={info => {
          const originalId = (info.node as SankeyNode)._originalId;
          const isWorld = originalId === 'WORLD';
          return (
            <Paper shadow="sm" radius="sm" p="md">
              <Stack gap="xs">
                <Text size="md" fw={500}>
                  {info.node.id}
                </Text>
                {!isWorld && (
                  <Group gap="xs">
                    <MantineTooltip label="Open factory" withArrow>
                      <ActionIcon
                        component={Link}
                        to={`/factories/${originalId}`}
                        variant="default"
                        size="sm"
                        aria-label="Open factory"
                      >
                        <IconEye size={14} />
                      </ActionIcon>
                    </MantineTooltip>
                    <MantineTooltip label="Open calculator" withArrow>
                      <ActionIcon
                        component={Link}
                        to={`/factories/${originalId}/calculator`}
                        variant="filled"
                        color="cyan"
                        size="sm"
                        aria-label="Open calculator"
                      >
                        <IconCalculator size={14} />
                      </ActionIcon>
                    </MantineTooltip>
                  </Group>
                )}
              </Stack>
            </Paper>
          );
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
