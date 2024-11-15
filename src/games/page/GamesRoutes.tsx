import { Footer } from '@/layout/Footer';
import { Header } from '@/layout/Header';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { GamesAtleastOneManager } from '@/games/manager/GamesAtleastOneManager';
import { GamesPage } from './GamesPage';
import { SharedGameImporterPage } from './share/SharedGameImporterPage';

export interface IGamesRoutesProps {}

export function GamesRoutes(props: IGamesRoutesProps) {
  const navigate = useNavigate();
  return (
    <>
      <GamesAtleastOneManager />
      <Header>
        {/* <Container size="lg" mb="sm">
          <Text size="md" fw={700}>
            Games
          </Text>
        </Container> */}
      </Header>

      <Routes>
        <Route index element={<GamesPage />} />
        <Route path="shared" element={<SharedGameImporterPage />} />
      </Routes>

      <Footer />
    </>
  );
}
