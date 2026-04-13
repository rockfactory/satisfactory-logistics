import { Route, Routes, useNavigate } from 'react-router-dom';
import { AppContainer } from '@/layout/AppContainer';
import { Footer } from '@/layout/Footer';
import { Header } from '@/layout/Header';
import { CodexBuildingDetail } from './buildings/CodexBuildingDetail';
import { CodexBuildingsPage } from './buildings/CodexBuildingsPage';
import { CodexPage } from './CodexPage';
import { CodexItemDetail } from './items/CodexItemDetail';
import { CodexItemsPage } from './items/CodexItemsPage';
import { CodexRecipeDetail } from './recipes/CodexRecipeDetail';
import { CodexRecipesPage } from './recipes/CodexRecipesPage';

export function CodexRoutes() {
  const navigate = useNavigate();

  return (
    <AppContainer
      header={
        <Header
          tabs={['factories', 'charts', 'calculator', 'codex']}
          activeTab="codex"
          onChangeTab={value => {
            if (value === 'codex') {
              navigate('/codex');
            } else if (value === 'factories') {
              navigate('/factories');
            } else {
              navigate(`/factories/${value}`);
            }
          }}
        />
      }
      footer={<Footer compact={false} />}
    >
      <Routes>
        <Route index element={<CodexPage />} />
        <Route path="items" element={<CodexItemsPage />} />
        <Route path="items/:id" element={<CodexItemDetail />} />
        <Route path="buildings" element={<CodexBuildingsPage />} />
        <Route path="buildings/:id" element={<CodexBuildingDetail />} />
        <Route path="recipes" element={<CodexRecipesPage />} />
        <Route path="recipes/:id" element={<CodexRecipeDetail />} />
      </Routes>
    </AppContainer>
  );
}
