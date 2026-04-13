import {
  Route,
  Routes,
  ScrollRestoration,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { ChartsTab } from '@/factories/charts/ChartsTab';
import { FactoryPage } from '@/factories/details/FactoryPage';
import { FactoriesTab } from '@/factories/FactoriesTab';
import { GamesAtleastOneManager } from '@/games/manager/GamesAtleastOneManager';
import { AppContainer } from '@/layout/AppContainer';
import { Footer } from '@/layout/Footer';
import { Header } from '@/layout/Header';
import { SolverPage } from '@/solver/page/SolverPage';
import { SolverShareImporterPage } from '@/solver/share/SolverShareImporter';

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
  const { pathname } = useLocation();

  const activeTab = useActiveTab();

  return (
    <AppContainer
      header={
        <Header
          tabs={['factories', 'charts', 'calculator', 'codex']}
          activeTab={
            activeTab === 'charts'
              ? 'charts'
              : activeTab === 'calculator'
                ? 'calculator'
                : 'factories'
          }
          onChangeTab={value => {
            if (value === 'codex') {
              navigate('/codex');
            } else {
              navigate(`/factories/${value === 'factories' ? '' : value}`);
            }
          }}
        />
      }
      footer={
        <Footer
          compact={
            activeTab === 'calculator' ||
            activeTab === 'charts' ||
            pathname.endsWith('/calculator')
          }
        />
      }
    >
      <ScrollRestoration
        getKey={(location, matches) => {
          return location.pathname;
        }}
      />
      <GamesAtleastOneManager />

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
    </AppContainer>
  );
}
