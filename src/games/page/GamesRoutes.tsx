import { Route, Routes } from 'react-router-dom';
import { GamesAtleastOneManager } from '@/games/manager/GamesAtleastOneManager';
import { GamesPage } from './GamesPage';
import { SharedGameImporterPage } from './share/SharedGameImporterPage';

export function GamesRoutes() {
  return (
    <>
      <GamesAtleastOneManager />
      <Routes>
        <Route index element={<GamesPage />} />
        <Route path="shared" element={<SharedGameImporterPage />} />
      </Routes>
    </>
  );
}
