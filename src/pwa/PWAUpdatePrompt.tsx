import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCloudCheck, IconReload } from '@tabler/icons-react';
import { useEffect } from 'react';

const UPDATE_NOTIFICATION_ID = 'pwa-update-available';
const OFFLINE_READY_NOTIFICATION_ID = 'pwa-offline-ready';
const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('SW registration failed', error);
    },
  });

  // Trigger registration.update() aggressively so long-running tabs pick up new
  // deploys quickly: once on mount, on every interval tick, and whenever the
  // tab becomes visible again (typical when alt-tabbing back from the game).
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    let activeRegistration: ServiceWorkerRegistration | null = null;

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      activeRegistration?.update().catch(() => {});
    };

    navigator.serviceWorker.ready
      .then(registration => {
        if (cancelled) return;
        activeRegistration = registration;
        registration.update().catch(() => {});
        interval = setInterval(() => {
          registration.update().catch(() => {});
        }, UPDATE_CHECK_INTERVAL_MS);
      })
      .catch(() => {});

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

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
