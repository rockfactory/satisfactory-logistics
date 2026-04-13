import { Route, Routes, useNavigate } from 'react-router-dom';
import { AppContainer } from '@/layout/AppContainer';
import { Footer } from '@/layout/Footer';
import { Header } from '@/layout/Header';
import { SplitterCalculatorPage } from '../splitter-calculator/page/SplitterCalculatorPage';
import { ToolsPage } from './ToolsPage';

export function ToolsRoutes() {
  const navigate = useNavigate();

  return (
    <AppContainer
      header={
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
      }
      footer={<Footer compact={false} />}
    >
      <Routes>
        <Route index element={<ToolsPage />} />
        <Route
          path="splitter-calculator"
          element={<SplitterCalculatorPage />}
        />
      </Routes>
    </AppContainer>
  );
}
