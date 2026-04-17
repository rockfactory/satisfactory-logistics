import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCloudCheck, IconReload } from '@tabler/icons-react';
import { useEffect } from 'react';

const UPDATE_NOTIFICATION_ID = 'pwa-update-available';
const OFFLINE_READY_NOTIFICATION_ID = 'pwa-offline-ready';

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;
      // Re-check every hour while the tab stays open so long-running sessions pick up new deploys.
      setInterval(
        () => {
          registration.update().catch(() => {});
        },
        60 * 60 * 1000,
      );
    },
    onRegisterError(error) {
      console.error('SW registration failed', error);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    notifications.show({
      id: UPDATE_NOTIFICATION_ID,
      title: 'Update available',
      message: (
        <Group gap="sm" align="center" wrap="nowrap">
          <Text size="sm">A new version is ready. Reload to apply it.</Text>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconReload size={14} />}
            onClick={() => updateServiceWorker(true)}
          >
            Reload
          </Button>
        </Group>
      ),
      color: 'blue',
      autoClose: false,
      withCloseButton: true,
      onClose: () => setNeedRefresh(false),
    });
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  useEffect(() => {
    if (!offlineReady) return;
    notifications.show({
      id: OFFLINE_READY_NOTIFICATION_ID,
      title: 'Ready for offline use',
      message: 'You can now use the app without a connection.',
      color: 'teal',
      icon: <IconCloudCheck size={18} />,
      autoClose: 6000,
      onClose: () => setOfflineReady(false),
    });
  }, [offlineReady, setOfflineReady]);

  return null;
}
