import { Footer } from '@/layout/Footer';
import { Header } from '@/layout/Header';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { GamesPage } from './GamesPage';
import { SharedGameImporterPage } from './share/SharedGameImporterPage';

export interface IGamesRoutesProps {}

export function GamesRoutes(props: IGamesRoutesProps) {
  const navigate = useNavigate();
  return (
    <>
      <Header />

      <Routes>
        <Route index element={<GamesPage />} />
        <Route path="shared" element={<SharedGameImporterPage />} />
      </Routes>

      <Footer />
    </>
  );
}
