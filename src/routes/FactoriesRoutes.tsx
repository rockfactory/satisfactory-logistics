import { ChartsTab } from '@/factories/charts/ChartsTab';
import { GamesAtleastOneManager } from '@/games/manager/GamesAtleastOneManager';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { FactoriesTab } from '@/factories/FactoriesTab';
import { Footer } from '@/layout/Footer';
import { Header } from '@/layout/Header';
import { SolverPage } from '@/solver/page/SolverPage';
import { SolverShareImporterPage } from '@/solver/share/SolverShareImporter';
export interface IFactoryRoutesProps {}

function useActiveTab() {
  const pathname = useLocation().pathname;
  if (pathname.includes('calculator')) {
    return 'calculator';
  }
  return pathname.split('/')[2];
}

export function FactoryRoutes(props: IFactoryRoutesProps) {
  const navigate = useNavigate();

  const activeTab = useActiveTab();

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
      <Footer compact={activeTab === 'calculator'} />
    </>
  );
}
