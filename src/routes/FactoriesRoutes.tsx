import { Tabs } from '@mantine/core';
import { useState } from 'react';
import { ChartsTab } from '../factories/charts/ChartsTab';
import { FactoriesTab } from '../factories/FactoriesTab';
import { Footer } from '../layout/Footer';
import { Header } from '../layout/Header';

export interface IFactoryRoutesProps {}

export function FactoryRoutes(props: IFactoryRoutesProps) {
  const [currentTab, setCurrentTab] = useState('Factories' as string | null);

  return (
    <>
      <Header
        tabs={['Factories', 'Charts']}
        activeTab={currentTab}
        onChangeTab={setCurrentTab}
      />

      <Tabs value={currentTab} keepMounted={false}>
        <Tabs.Panel value="Factories">
          <FactoriesTab />
        </Tabs.Panel>
        <Tabs.Panel value="Charts">
          <ChartsTab />
        </Tabs.Panel>
      </Tabs>
      <Footer />
    </>
  );
}
