import { ChartsTab } from '@/factories/charts/ChartsTab';
import { GamesAtleastOneManager } from '@/games/manager/GamesAtleastOneManager';
import {
  Route,
  Routes,
  ScrollRestoration,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { FactoriesTab } from '@/factories/FactoriesTab';
import { Footer } from '@/layout/Footer';
import { Header } from '@/layout/Header';
import { SolverPage } from '@/solver/page/SolverPage';
import { SolverShareImporterPage } from '@/solver/share/SolverShareImporter';
import { FactoryPage } from '@/factories/details/FactoryPage.tsx';
export interface IFactoryRoutesProps {}

function useActiveTab() {
  const { pathname } = useLocation();

  if (pathname.startsWith('/factories/charts')) {
    return 'charts';
  }
  if (pathname.startsWith('/factories/calculator')) {
    return 'calculator';
  }
  if (pathname.startsWith('/factories')) {
    return 'factories';
  }
  throw new Error('Unrecognized pathname ' + pathname);
}

export function FactoryRoutes(props: IFactoryRoutesProps) {
  const navigate = useNavigate();

  const activeTab = useActiveTab();

  return (
    <>
      <ScrollRestoration
        getKey={(location, matches) => {
          return location.pathname;
        }}
      />
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
          navigate(`/factories/${value === 'factories' ? '' : value}`);
        }}
      />

      <Routes>
        <Route index element={<FactoriesTab />} />
        <Route path=":id" element={<FactoryPage currentView="overview" />} />
        <Route
          path=":id/calculator"
          element={<FactoryPage currentView="calculator" />}
        />
        <Route path="charts" element={<ChartsTab />} />
        <Route path="calculator" element={<SolverPage />} />
        <Route
          path="calculator/shared/:sharedId"
          element={<SolverShareImporterPage />}
        />
      </Routes>
      <Footer compact={activeTab === 'calculator'} />
    </>
  );
}
