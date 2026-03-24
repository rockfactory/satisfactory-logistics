import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Footer } from '@/layout/Footer';
import { Header } from '@/layout/Header';
import { SplitterCalculatorPage } from '../splitter-calculator/page/SplitterCalculatorPage';
import { ToolsPage } from './ToolsPage';

function useActiveToolsTab() {
  const pathname = useLocation().pathname;
  if (pathname.includes('splitter')) return 'tools';
  return pathname.split('/')[1] || 'tools';
}

export function ToolsRoutes() {
  const navigate = useNavigate();
  const activeTab = useActiveToolsTab();

  return (
    <>
      <Header
        tabs={['factories', 'charts', 'calculator', 'tools']}
        activeTab="tools"
        onChangeTab={value => {
          if (value === 'tools') {
            navigate('/tools');
          } else if (value === 'factories') {
            navigate('/factories');
          } else {
            navigate(`/factories/${value}`);
          }
        }}
      />
      <Routes>
        <Route index element={<ToolsPage />} />
        <Route
          path="splitter-calculator"
          element={<SplitterCalculatorPage />}
        />
      </Routes>
      <Footer compact={false} />
    </>
  );
}
