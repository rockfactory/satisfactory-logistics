import { useStore } from '@/core/zustand';
import { AfterHeaderSticky } from '@/layout/AfterHeaderSticky';
import { Box, Container, Group, SegmentedControl, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useGameFactories } from '../../games/store/gameFactoriesSelectors';
import { FactoriesGraphContainer } from './graph/FactoriesGraphContainer';
import { FactoriesGraphSettingsModal } from './graph/settings/FactoriesGraphSettingsModal';
import { FactoriesSankeyChart } from './sankey/FactoriesSankeyChart';
import { useChartsView } from './store/chartsSlice';

export interface IChartsTabProps {}

export function ChartsTab(_props: IChartsTabProps) {
  const factories = useGameFactories();

  const view = useChartsView();

  if (factories.length === 0) {
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
      <AfterHeaderSticky>
        <Group gap="xs">
          <SegmentedControl
            value={view}
            onChange={value => useStore.getState().setChartView(value as any)}
            data={[
              { value: 'graph', label: 'Graph' },
              { value: 'sankey', label: 'Sankey' },
            ]}
          />
          {view === 'graph' && <FactoriesGraphSettingsModal />}
        </Group>
      </AfterHeaderSticky>
      {view === 'graph' && <FactoriesGraphContainer />}
      {view === 'sankey' && <FactoriesSankeyChart />}
    </div>
  );
}
