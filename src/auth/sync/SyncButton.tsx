import { Button, Group, Text } from '@mantine/core';
import { IconCheck, IconUpload } from '@tabler/icons-react';
import { useSession, useSync } from '../AuthSlice';
import { saveLocalState } from './useSyncLocalAndRemoteStore';

export interface ISyncButtonProps {}

export function SyncButton(props: ISyncButtonProps) {
  const sync = useSync();
  const session = useSession();
  const isSynced = sync.latestChangeDetectedAt <= sync.syncedAt;
  console.log('isSynced', isSynced, sync.latestChangeDetectedAt, sync.syncedAt);
  const handleSync = async () => {
    await saveLocalState();
  };

  if (!session) {
    return null;
  }

  return isSynced ? (
    <Group gap="xs">
      <IconCheck size={16} />
      <Text size="sm"> Saved online</Text>
    </Group>
  ) : (
    <Button
      leftSection={<IconUpload size={16} />}
      variant="default"
      onClick={handleSync}
      loading={sync.isSyncing}
    >
      Save online
    </Button>
  );
}
