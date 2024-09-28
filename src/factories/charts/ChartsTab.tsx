import { Box, Paper, Text } from '@mantine/core';
import { DefaultLink, DefaultNode, ResponsiveSankey } from '@nivo/sankey';
import { useMemo } from 'react';
import { AllFactoryItemsMap } from '../../recipes/FactoryItem';
import { useFactories } from '../store/FactoriesSlice';

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
  const factories = useFactories();

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

  console.log(data);

  return (
    <div>
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
    </div>
  );
}
