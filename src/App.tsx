import { Container, MantineProvider, Tabs } from '@mantine/core';
import '@mantine/core/styles.css';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import { useState } from 'react';
import { ChartsTab } from './factories/charts/ChartsTab';
import { FactoriesTab } from './factories/FactoriesTab';
import { FactoriesWideTab } from './factories/wide/FactoriesWideTab';
import { Footer } from './layout/Footer';
import { MainLayout } from './layout/MainLayout';
import { theme } from './theme';

export default function App() {
  const tabs = ['Factories'];
  const [currentTab, setCurrentTab] = useState(tabs[0] as string | null);
  return (
    <MantineProvider theme={theme}>
      <Notifications position="top-right" zIndex={1000} />
      <MainLayout
        tabs={['Factories', 'Wide View', 'Charts']}
        activeTab={currentTab}
        onChangeTab={setCurrentTab}
      />
      <Container size="lg" mt="lg">
        <Tabs value={currentTab} keepMounted={false}>
          <Tabs.Panel value="Factories">
            <FactoriesTab />
          </Tabs.Panel>
          <Tabs.Panel value="Wide View">
            <FactoriesWideTab />
          </Tabs.Panel>
          <Tabs.Panel value="Charts">
            <ChartsTab />
          </Tabs.Panel>
        </Tabs>
      </Container>
      <Footer />
    </MantineProvider>
  );
}
