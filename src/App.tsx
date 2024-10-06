import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';

import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from 'react-router-dom';
import { AuthSessionManager } from './auth/AuthSessionManager';
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
    element: <Navigate to="/factories" />,
  },
]);

export default function App() {
  const tabs = ['Factories'];

  // const [currentTab, setCurrentTab] = useState(tabs[0] as string | null);
  return (
    <MantineProvider theme={theme} forceColorScheme="dark">
      <AuthSessionManager />
      <SyncManager />
      <Notifications position="top-right" zIndex={1000} />
      <RouterProvider router={router} />
    </MantineProvider>
  );
}
