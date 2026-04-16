import { useAutoSaveOnLogin } from '@/games/sync/useAutoSaveOnLogin';
import { useRealtimeGameSync } from '@/games/sync/useRealtimeGameSync';
import { useSyncLocalAndRemoteStore } from './useSyncLocalAndRemoteStore';

export interface ISyncManagerProps {}

export function SyncManager(props: ISyncManagerProps) {
  useSyncLocalAndRemoteStore();
  useAutoSaveOnLogin();
  useRealtimeGameSync();

  return null;
}
