import { Route, Routes } from 'react-router-dom';
import { SplitterCalculatorPage } from '../splitter-calculator/page/SplitterCalculatorPage';
import { ToolsPage } from './ToolsPage';

export function ToolsRoutes() {
  return (
    <Routes>
      <Route index element={<ToolsPage />} />
      <Route path="splitter-calculator" element={<SplitterCalculatorPage />} />
    </Routes>
  );
}
