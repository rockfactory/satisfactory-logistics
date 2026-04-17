import { Route, Routes, ScrollRestoration } from 'react-router-dom';
import { ChartsTab } from '@/factories/charts/ChartsTab';
import { FactoryPage } from '@/factories/details/FactoryPage';
import { FactoriesTab } from '@/factories/FactoriesTab';
import { GamesAtleastOneManager } from '@/games/manager/GamesAtleastOneManager';
import { SolverPage } from '@/solver/page/SolverPage';
import { SolverShareImporterPage } from '@/solver/share/SolverShareImporter';

export function FactoryRoutes() {
  return (
    <>
      <ScrollRestoration
        getKey={location => {
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
    </>
  );
}
