import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ChartsTab } from '../factories/charts/ChartsTab';
import { FactoriesTab } from '../factories/FactoriesTab';
import { Footer } from '../layout/Footer';
import { Header } from '../layout/Header';
import { SolverPage } from '../recipes/solver/page/SolverPage';
import { SolverShareImporterPage } from '../recipes/solver/share/SolverShareImporter';

export interface IFactoryRoutesProps {}

export function FactoryRoutes(props: IFactoryRoutesProps) {
  const navigate = useNavigate();
  const activeTab = useLocation().pathname.split('/')[2];

  return (
    <>
      <Header
        tabs={['factories', 'charts', 'calculator']}
        activeTab={
          activeTab === 'charts'
            ? 'charts'
            : activeTab === 'calculator'
              ? 'calculator'
              : 'factories'
        }
        onChangeTab={value => {
          console.log('Navigating to', value);
          navigate(`/factories/${value === 'factories' ? '' : value}`);
        }}
      />

      <Routes>
        <Route index element={<FactoriesTab />} />
        <Route path=":id/calculator" element={<SolverPage />} />
        <Route path="charts" element={<ChartsTab />} />
        <Route path="calculator/:id?" element={<SolverPage />} />
        <Route
          path="calculator/shared/:sharedId"
          element={<SolverShareImporterPage />}
        />
      </Routes>

      {/* <Tabs value={factoriesTab} keepMounted={false}>
        <Tabs.Panel value="factories">
          <Routes>
            <Route path=":id/calculator" element={<SolverPage />} />
            <Route index element={<FactoriesTab />} />
          </Routes>
        </Tabs.Panel>
        <Tabs.Panel value="charts">
          <ChartsTab />
        </Tabs.Panel>
        <Tabs.Panel value="calculator">
          <SolverPage />
        </Tabs.Panel>
      </Tabs> */}
      <Footer />
    </>
  );
}
