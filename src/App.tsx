import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';

import { useEffect } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { LoginPage } from './auth/LoginPage';
import { PrivacyPolicy } from './auth/privacy/PrivacyPolicy';
import { SyncManager } from './auth/sync/SyncManager';
import { RecipeSolverDemo } from './recipes/solver/RecipeSolverDemo';
import { FactoryRoutes } from './routes/FactoriesRoutes';
import { theme } from './theme';

const router = createBrowserRouter([
  {
    path: '/privacy-policy',
    element: <PrivacyPolicy />,
  },
  {
    path: '/factories/*',
    element: <FactoryRoutes />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/solver',
    element: <RecipeSolverDemo />,
  },
  {
    path: '*',
    element: <Redirect to="/factories" />,
  },
]);

function Redirect({ to }: { to: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    navigate({
      pathname: to,
      search: location.search,
      hash: location.hash,
    });
  }, [location]);

  return null;
}

export default function App() {
  const tabs = ['Factories'];

  // const [currentTab, setCurrentTab] = useState(tabs[0] as string | null);
  return (
    <MantineProvider theme={theme} forceColorScheme="dark">
      <SyncManager />
      <Notifications position="top-right" zIndex={1000} />
      <RouterProvider router={router} />
    </MantineProvider>
  );
}
