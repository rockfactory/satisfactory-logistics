import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthSessionManager } from './auth/AuthSessionManager';
import { LoginPage } from './auth/LoginPage';
import { SyncManager } from './auth/sync/SyncManager';
import { FactoryRoutes } from './routes/FactoriesRoutes';
import { theme } from './theme';

const router = createBrowserRouter([
  {
    path: '/',
    element: <FactoryRoutes />,
  },
  {
    path: '/login',
    element: <LoginPage />,
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
