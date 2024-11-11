import { Center, Loader, MantineProvider, Modal } from '@mantine/core';
import '@mantine/core/styles.css';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';

import { ModalsProvider } from '@mantine/modals';
import { useEffect } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  useLocation,
  useNavigate,
  useRouteError,
} from 'react-router-dom';
import { LoginPage } from './auth/LoginPage';
import { PrivacyPolicy } from './auth/privacy/PrivacyPolicy';
import { SyncManager } from './auth/sync/SyncManager';
import { useStore } from './core/zustand';
import { GamesRoutes } from './games/page/GamesRoutes';
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
    ErrorBoundary: () => {
      throw useRouteError();
    },
  },
  {
    path: '/games/*',
    element: <GamesRoutes />,
    ErrorBoundary: () => {
      throw useRouteError();
    },
  },
  {
    path: '/login',
    element: <LoginPage />,
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
  }, [location, navigate, to]);

  return null;
}

export default function App() {
  const hasRehydrated = useStore(
    state => state.gameSave.hasRehydratedLocalData,
  );

  if (!hasRehydrated) {
    console.log('Waiting for rehydration');
    return (
      <MantineProvider theme={theme} forceColorScheme="dark">
        <Modal
          opened
          onClose={() => {}}
          closeOnClickOutside={false}
          closeOnEscape={false}
          withCloseButton={false}
          centered
          size="sm"
        >
          <Center p="md">
            <Loader size="xl" />
          </Center>
        </Modal>
      </MantineProvider>
    );
  }

  console.log('Rehydrated, rendering app');

  return (
    <MantineProvider theme={theme} forceColorScheme="dark">
      <ModalsProvider>
        <SyncManager />
        <Notifications position="top-right" zIndex={1000} />
        <RouterProvider router={router} />
      </ModalsProvider>
    </MantineProvider>
  );
}
