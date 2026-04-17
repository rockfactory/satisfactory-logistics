import { Route, Routes } from 'react-router-dom';
import { MapPage } from '@/map/MapPage';

export function MapRoutes() {
  return (
    <Routes>
      <Route index element={<MapPage />} />
    </Routes>
  );
}
