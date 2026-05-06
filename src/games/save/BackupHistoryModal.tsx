import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconHistory, IconRefresh, IconRestore } from '@tabler/icons-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Json } from '@/core/database.types';
import { loglev } from '@/core/logger/log';
import { supabaseClient } from '@/core/supabase';
import { useStore } from '@/core/zustand';
import type { GameRemoteData } from '@/games/Game';
import { withSuppressedDirtyTracking } from '@/games/save/dirtyTrackingSuppression';
import { saveRemoteGame } from '@/games/save/saveRemoteGame';
import { snapshotRemote } from '@/games/save/snapshotRemoteGame';
import {
  type SerializedGame,
  serializeGame,
} from '@/games/store/gameFactoriesActions';
import { withSuppressedBroadcast } from '@/games/sync/realtimeSyncTypes';

dayjs.extend(relativeTime);

const logger = loglev.getLogger('games:backup-history');

interface BackupRow {
  id: string;
  version: number;
  reason: string;
  created_at: string;
  author_id: string;
}

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  auto: { label: 'Auto', color: 'gray' },
  manual: { label: 'Manual', color: 'green' },
  'pre-restore': { label: 'Pre-restore', color: 'blue' },
  'shrink-guard': { label: 'Safety', color: 'orange' },
  'shrink-guard-fullstate': { label: 'Safety (sync)', color: 'orange' },
  'shrink-guard-dbfallback': { label: 'Safety (DB)', color: 'orange' },
};

export interface IBackupHistoryModalProps {
  gameId: string;
  opened: boolean;
  onClose: () => void;
}

export function BackupHistoryModal(props: IBackupHistoryModalProps) {
  const { gameId, opened, onClose } = props;
  const savedId = useStore(state => state.games.games[gameId]?.savedId);

  const [rows, setRows] = useState<BackupRow[] | null>(null);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!savedId) {
      setRows([]);
      return;
    }
    try {
      const { data, error } = await supabaseClient
        .from('game_versions')
        .select('id, version, reason, created_at, author_id')
        .eq('saved_id', savedId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRows((data ?? []) as BackupRow[]);
    } catch (err) {
      logger.error('Failed to load backup history', err);
      notifications.show({
        color: 'red',
        title: 'Failed to load backups',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [savedId]);

  // Refresh whenever the modal becomes visible (and on saved-id change while
  // open). Avoids stale data after a save/snapshot happened in the
  // background.
  useEffect(() => {
    if (!opened) return;
    void refresh();
  }, [opened, refresh]);

  const onSaveSnapshotNow = useCallback(async () => {
    if (!savedId) return;
    try {
      await snapshotRemote(
        savedId,
        'manual',
        serializeGame(gameId) as unknown as Json,
      );
      notifications.show({
        color: 'green',
        title: 'Snapshot saved',
        message: 'A backup of the current state has been saved.',
      });
      await refresh();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Failed to save snapshot',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }, [gameId, savedId, refresh]);

  const onRestore = useCallback(
    (row: BackupRow) => {
      if (!savedId) return;
      const taken = dayjs(row.created_at).format('YYYY-MM-DD HH:mm');
      modals.openConfirmModal({
        title: 'Restore backup',
        children: (
          <Stack gap="xs">
            <Text size="sm">
              Replace the current game contents with the snapshot taken on{' '}
              <Text span fw={600}>
                {taken}
              </Text>
              ?
            </Text>
            <Text size="xs" c="dimmed">
              A safety snapshot of your current state will be saved first so you
              can roll the restore back if needed.
            </Text>
          </Stack>
        ),
        labels: { confirm: 'Restore', cancel: 'Cancel' },
        confirmProps: {
          color: 'orange',
          leftSection: <IconRestore size={14} />,
        },
        onConfirm: () => {
          void doRestore(row);
        },
      });

      async function doRestore(row: BackupRow) {
        if (!savedId) return;
        setBusyRowId(row.id);
        try {
          // Pre-restore safety snapshot.
          await snapshotRemote(
            savedId,
            'pre-restore',
            serializeGame(gameId) as unknown as Json,
          );

          // Fetch the snapshot payload (the list query intentionally does
          // not include `data` to keep it small).
          const { data, error } = await supabaseClient
            .from('game_versions')
            .select('data')
            .eq('id', row.id)
            .single();
          if (error) throw error;
          const serialized = data!.data as unknown as SerializedGame;

          const localGame = useStore.getState().games.games[gameId];
          const remoteData: Partial<GameRemoteData> = {
            id: savedId,
            author_id: localGame?.authorId,
            created_at: localGame?.createdAt,
            updated_at: localGame?.updatedAt,
            share_token: localGame?.shareToken,
          };

          withSuppressedBroadcast(() => {
            withSuppressedDirtyTracking(() => {
              useStore
                .getState()
                .loadRemoteGame(serialized, remoteData, { override: true });
            });
          });

          // Push the restored state unconditionally — restore is an
          // explicit user override, the optimistic-locking filter would
          // race here.
          await saveRemoteGame(gameId, { silent: true, unconditional: true });

          notifications.show({
            color: 'green',
            title: 'Game restored',
            message: `Restored snapshot from ${taken}.`,
          });
          await refresh();
        } catch (err) {
          logger.error('Restore failed', err);
          notifications.show({
            color: 'red',
            title: 'Failed to restore backup',
            message: err instanceof Error ? err.message : 'Unknown error',
          });
        } finally {
          setBusyRowId(null);
        }
      }
    },
    [gameId, savedId, refresh],
  );

  const body = useMemo(() => {
    if (!savedId) {
      return (
        <Text size="sm" c="dimmed">
          Backups become available once the game has been saved to your account
          at least once.
        </Text>
      );
    }
    if (rows === null) {
      return (
        <Group gap="xs">
          <Loader size="xs" />
          <Text size="sm" c="dimmed">
            Loading backups…
          </Text>
        </Group>
      );
    }
    if (rows.length === 0) {
      return (
        <Text size="sm" c="dimmed">
          No backups yet. The first one is taken automatically a few minutes
          after the next save.
        </Text>
      );
    }
    return (
      <Table
        striped
        withColumnBorders={false}
        verticalSpacing="xs"
        horizontalSpacing="xs"
        styles={{ td: { fontSize: 'var(--mantine-font-size-xs)' } }}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th>When</Table.Th>
            <Table.Th>Version</Table.Th>
            <Table.Th>Reason</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map(row => {
            const reason = REASON_LABELS[row.reason] ?? {
              label: row.reason,
              color: 'gray',
            };
            return (
              <Table.Tr key={row.id}>
                <Table.Td>
                  <Tooltip
                    label={dayjs(row.created_at).format('YYYY-MM-DD HH:mm:ss')}
                  >
                    <Text size="xs">{dayjs(row.created_at).fromNow()}</Text>
                  </Tooltip>
                </Table.Td>
                <Table.Td>v{row.version}</Table.Td>
                <Table.Td>
                  <Badge size="xs" color={reason.color} variant="light">
                    {reason.label}
                  </Badge>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Button
                    size="compact-xs"
                    variant="light"
                    color="orange"
                    leftSection={<IconRestore size={12} />}
                    loading={busyRowId === row.id}
                    onClick={() => onRestore(row)}
                  >
                    Restore
                  </Button>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    );
  }, [savedId, rows, busyRowId, onRestore]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={
        <Group gap="xs">
          <ThemeIcon variant="light" color="red" size="md" radius="sm">
            <IconHistory size={16} />
          </ThemeIcon>
          <Text fw={600} size="sm">
            Backup History
          </Text>
        </Group>
      }
    >
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Text size="xs" c="dimmed" style={{ flex: 1 }}>
            Up to 20 snapshots are kept per game (oldest are pruned). Auto
            snapshots happen at most once every 15 minutes.
          </Text>
          <Group gap="xs" wrap="nowrap">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => {
                void refresh();
              }}
              aria-label="Refresh backup list"
            >
              <IconRefresh size={14} />
            </ActionIcon>
            <Button
              size="compact-xs"
              variant="light"
              color="green"
              disabled={!savedId}
              onClick={() => {
                void onSaveSnapshotNow();
              }}
            >
              Save snapshot now
            </Button>
          </Group>
        </Group>
        {body}
      </Stack>
    </Modal>
  );
}
