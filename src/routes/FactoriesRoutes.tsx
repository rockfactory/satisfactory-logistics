import { Container, Tabs } from '@mantine/core';
import { useState } from 'react';
import { ChartsTab } from '../factories/charts/ChartsTab';
import { FactoriesTab } from '../factories/FactoriesTab';
import { FactoriesWideTab } from '../factories/wide/FactoriesWideTab';
import { Footer } from '../layout/Footer';
import { MainLayout } from '../layout/MainLayout';

export interface IFactoryRoutesProps {}

export function FactoryRoutes(props: IFactoryRoutesProps) {
  const [currentTab, setCurrentTab] = useState('Factories' as string | null);

  return (
    <>
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
    </>
  );
}
