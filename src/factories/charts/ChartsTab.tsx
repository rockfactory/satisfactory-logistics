import { Box, Container, Group, SegmentedControl, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useStore } from '@/core/zustand';
import { useGameFactories } from '@/games/store/gameFactoriesSelectors';
import { AfterHeaderSticky } from '@/layout/AfterHeaderSticky';
import { FullHeightContainer } from '@/layout/FullHeightContainer';
import { DepotOverviewTab } from './depot/DepotOverviewTab';
import { FactoriesGraphContainer } from './graph/FactoriesGraphContainer';
import { FactoriesGraphSettingsModal } from './graph/settings/FactoriesGraphSettingsModal';
import { FactoriesSankeyChart } from './sankey/FactoriesSankeyChart';
import { type ChartView, useChartsView } from './store/chartsSlice';

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
    <>
      <AfterHeaderSticky>
        <Group gap="xs">
          <SegmentedControl
            data-tutorial-id="charts-view-switcher"
            value={view}
            radius="md"
            onChange={value =>
              useStore.getState().setChartView(value as ChartView)
            }
            data={[
              { value: 'graph', label: 'Graph' },
              { value: 'sankey', label: 'Sankey' },
              { value: 'depot', label: 'Dimensional Depot' },
            ]}
          />
          {view === 'graph' && <FactoriesGraphSettingsModal />}
        </Group>
      </AfterHeaderSticky>
      <FullHeightContainer>
        {view === 'graph' && <FactoriesGraphContainer />}
        {view === 'sankey' && <FactoriesSankeyChart />}
        {view === 'depot' && <DepotOverviewTab />}
      </FullHeightContainer>
    </>
  );
}
