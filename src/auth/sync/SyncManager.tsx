import { useAutoSaveOnLogin } from '@/games/sync/useAutoSaveOnLogin';
import { useRealtimeGameSync } from '@/games/sync/useRealtimeGameSync';

export interface ISyncManagerProps {}

export function SyncManager(props: ISyncManagerProps) {
  useAutoSaveOnLogin();
  useRealtimeGameSync();

  return null;
}
