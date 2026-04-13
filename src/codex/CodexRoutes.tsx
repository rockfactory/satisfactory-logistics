import { Route, Routes, useNavigate } from 'react-router-dom';
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
    <>
      <Header
        tabs={['factories', 'charts', 'calculator', 'tools', 'codex']}
        activeTab="codex"
        onChangeTab={value => {
          if (value === 'codex') {
            navigate('/codex');
          } else if (value === 'tools') {
            navigate('/tools');
          } else if (value === 'factories') {
            navigate('/factories');
          } else {
            navigate(`/factories/${value}`);
          }
        }}
      />
      <Routes>
        <Route index element={<CodexPage />} />
        <Route path="items" element={<CodexItemsPage />} />
        <Route path="items/:id" element={<CodexItemDetail />} />
        <Route path="buildings" element={<CodexBuildingsPage />} />
        <Route path="buildings/:id" element={<CodexBuildingDetail />} />
        <Route path="recipes" element={<CodexRecipesPage />} />
        <Route path="recipes/:id" element={<CodexRecipeDetail />} />
      </Routes>
      <Footer compact={false} />
    </>
  );
}
