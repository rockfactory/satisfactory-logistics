import { Tabs } from '@mantine/core';
import { useNavigate, useParams } from 'react-router-dom';
import { ChartsTab } from '../factories/charts/ChartsTab';
import { FactoriesTab } from '../factories/FactoriesTab';
import { Footer } from '../layout/Footer';
import { Header } from '../layout/Header';
import { SolverPage } from '../recipes/solver/page/SolverPage';

export interface IFactoryRoutesProps {}

export function FactoryRoutes(props: IFactoryRoutesProps) {
  const navigate = useNavigate();
  const { factoriesTab } = useParams();

  return (
    <>
      <Header
        tabs={['factories', 'charts', 'calculator']}
        activeTab={factoriesTab}
        onChangeTab={value => navigate(`/factories/${value}`)}
      />

      <Tabs value={factoriesTab} keepMounted={false}>
        <Tabs.Panel value="factories">
          <FactoriesTab />
        </Tabs.Panel>
        <Tabs.Panel value="charts">
          <ChartsTab />
        </Tabs.Panel>
        <Tabs.Panel value="calculator">
          <SolverPage />
        </Tabs.Panel>
      </Tabs>
      <Footer />
    </>
  );
}
