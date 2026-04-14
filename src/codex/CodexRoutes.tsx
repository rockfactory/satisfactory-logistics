import { Route, Routes } from 'react-router-dom';
import { CodexBuildingDetail } from './buildings/CodexBuildingDetail';
import { CodexBuildingsPage } from './buildings/CodexBuildingsPage';
import { CodexPage } from './CodexPage';
import { CodexItemDetail } from './items/CodexItemDetail';
import { CodexItemsPage } from './items/CodexItemsPage';
import { CodexRecipeDetail } from './recipes/CodexRecipeDetail';
import { CodexRecipesPage } from './recipes/CodexRecipesPage';

export function CodexRoutes() {
  return (
    <Routes>
      <Route index element={<CodexPage />} />
      <Route path="items" element={<CodexItemsPage />} />
      <Route path="items/:id" element={<CodexItemDetail />} />
      <Route path="buildings" element={<CodexBuildingsPage />} />
      <Route path="buildings/:id" element={<CodexBuildingDetail />} />
      <Route path="recipes" element={<CodexRecipesPage />} />
      <Route path="recipes/:id" element={<CodexRecipeDetail />} />
    </Routes>
  );
}
