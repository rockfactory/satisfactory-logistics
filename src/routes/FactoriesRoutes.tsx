import { GamesAtleastOneManager } from '@/games/manager/GamesAtleastOneManager';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ChartsTab } from '../factories/charts/ChartsTab';
import { FactoriesTab } from '../factories/FactoriesTab';
import { Footer } from '../layout/Footer';
import { Header } from '../layout/Header';
import { SolverPage } from '../solver/page/SolverPage';
import { SolverShareImporterPage } from '../solver/share/SolverShareImporter';
export interface IFactoryRoutesProps {}

export function FactoryRoutes(props: IFactoryRoutesProps) {
  const navigate = useNavigate();
  const activeTab = useLocation().pathname.split('/')[2];

  return (
    <>
      <GamesAtleastOneManager />

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
      <Footer />
    </>
  );
}
